import {
  Component,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../services/order.service';
import { ToastService } from '../../../../services/toast.service';
import { CartService } from '../../../../services/cart.service';
import { ProductService } from '../../../../services/product.service';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '../../../../interfaces/order';
import { environment } from '../../../../../environments/environment';
import {
  DropDownListDirective,
  DropDownOptionSelected,
} from '../../../../directives/drop-down-list.directive';
import {
  PersianNumberPipe,
  TomanPipe,
  ThousandTomanPipe,
  toPersianDigits,
  formatToman,
} from '../../../../pipes/persian-number.pipe';
import { FoodMODEL } from '../../../../models/food-model';

const TIMELINE_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivering',
  'delivered',
];

@Component({
  selector: 'app-dashboard-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropDownListDirective,
    PersianNumberPipe,
    TomanPipe,
    ThousandTomanPipe,
  ],
  templateUrl: './dashboard-orders.component.html',
  styleUrl: './dashboard-orders.component.css',
})
export class DashboardOrdersComponent implements OnChanges, OnInit, OnDestroy {
  @Input({ required: true }) isAdmin = false;
  @Input() userRole = 'User';

  orders: Order[] = [];
  loading = false;
  expandedId: number | null = null;
  statusFilter = '';
  currentPage = 1;
  perPage = 10;
  totalOrders = 0;
  totalPages = 1;
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusColors = ORDER_STATUS_COLORS;
  readonly allStatuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
  readonly timelineSteps = TIMELINE_STEPS;
  editStatus: Record<number, string> = {};
  editNote: Record<number, string> = {};
  savingId: number | null = null;
  reorderingId: number | null = null;
  receiptId: number | null = null;

  // ---- Live order-journey tracking ----
  // Ticking clock (updated every second) used to drive live countdowns
  // and the riding-icon progress bar without needing extra backend fields.
  now: number = Date.now();
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  // Estimated duration (seconds) of each trackable phase, counted from the
  // moment the order entered that phase (order.updated_at).
  private readonly PHASE_ETA_SECONDS: Partial<Record<OrderStatus, number>> = {
    preparing: 18 * 60,
    delivering: 22 * 60,
  };
  private readonly READY_WAIT_SECONDS = 8 * 60;

  // Personal mini-dashboard (user side, computed client-side)
  personalStats = {
    totalOrders: 0,
    totalSpent: 0,
    favoriteCategory: '—',
  };

  constructor(
    private orderService: OrderService,
    private toast: ToastService,
    private cartService: CartService,
    private productService: ProductService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isAdmin'] || changes['userRole']) this.load();
  }

  ngOnInit(): void {
    // Drives every live countdown + the riding-icon position on screen.
    this.tickHandle = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  load(): void {
    this.loading = true;
    if (this.isAdmin) {
      this.orderService
        .adminListOrders({
          status: this.statusFilter || undefined,
          page: this.currentPage,
          per_page: this.perPage,
        })
        .subscribe({
          next: (res) => {
            this.orders = res?.data?.orders || [];
            this.totalOrders = res?.data?.total ?? this.orders.length;
            this.totalPages = res?.data?.total_pages ?? 1;
            this.currentPage = res?.data?.page ?? this.currentPage;
            this.orders.forEach((o) => {
              this.editStatus[o.order_ID] = o.status;
              this.editNote[o.order_ID] = o.admin_note || '';
            });
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.toast.error('دریافت سفارش‌ها ناموفق بود.');
          },
        });
    } else {
      this.orderService.getMyOrders().subscribe({
        next: (res) => {
          this.orders = res?.data || [];
          this.computePersonalStats();
          this.applyUserStatusFilter();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toast.error('دریافت سفارش‌ها ناموفق بود.');
        },
      });
    }
  }

  private allUserOrders: Order[] = [];

  private computePersonalStats(): void {
    this.allUserOrders = [...this.orders];
    const nonCancelled = this.orders.filter((o) => o.status !== 'cancelled');
    this.personalStats.totalOrders = this.orders.length;
    this.personalStats.totalSpent = nonCancelled.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0,
    );

    // Favorite category by quantity
    const catQty: Record<string, number> = {};
    for (const o of nonCancelled) {
      for (const item of o.items || []) {
        // category not on item; use title heuristic or skip — best effort from product_title is weak
        // We don't have category on order_items; leave as most frequent product title group
        const key = (item.product_title || '').split(' ')[0] || 'سایر';
        catQty[key] = (catQty[key] || 0) + item.quantity;
      }
    }
    let best = '—';
    let bestN = 0;
    for (const [k, n] of Object.entries(catQty)) {
      if (n > bestN) {
        bestN = n;
        best = k;
      }
    }
    this.personalStats.favoriteCategory = best;
  }

  private applyUserStatusFilter(): void {
    if (!this.statusFilter) {
      this.orders = [...this.allUserOrders];
    } else {
      this.orders = this.allUserOrders.filter(
        (o) => o.status === this.statusFilter,
      );
    }
  }

  get statusFilterLabel(): string {
    return this.statusFilter
      ? this.statusLabels[this.statusFilter as OrderStatus]
      : 'همه وضعیت‌ها';
  }

  onStatusFilterSelected(event: DropDownOptionSelected): void {
    this.statusFilter = event.value;
    this.onFilterChange();
  }

  orderStatusLabel(orderId: number): string {
    const value = this.editStatus[orderId] as OrderStatus;
    return this.statusLabels[value] || 'انتخاب وضعیت';
  }

  onOrderStatusSelected(order: Order, event: DropDownOptionSelected): void {
    this.editStatus[order.order_ID] = event.value as OrderStatus;
  }

  onFilterChange(): void {
    this.currentPage = 1;
    if (this.isAdmin) {
      this.load();
    } else {
      this.applyUserStatusFilter();
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    for (let p = Math.max(1, end - 4); p <= end; p++) pages.push(p);
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.expandedId = null;
    this.load();
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  toggle(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  imageUrl(path?: string): string {
    if (!path) return 'assets/web/logo.png';
    if (path.startsWith('http')) return path;
    return `${environment.websiteAPI || ''}/${path}`.replace(
      /([^:]\/)\/+/g,
      '$1',
    );
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('fa-IR');
    } catch {
      return iso;
    }
  }

  save(order: Order): void {
    if (!this.isAdmin) return;
    this.savingId = order.order_ID;
    this.orderService
      .adminUpdateOrder(order.order_ID, {
        status: this.editStatus[order.order_ID],
        admin_note: this.editNote[order.order_ID],
      })
      .subscribe({
        next: (res) => {
          this.savingId = null;
          this.toast.success(res?.message || 'سفارش به‌روزرسانی شد.');
          if (res?.data) {
            const idx = this.orders.findIndex(
              (o) => o.order_ID === order.order_ID,
            );
            if (idx >= 0) this.orders[idx] = res.data;
          }
        },
        error: (err) => {
          this.savingId = null;
          this.toast.error(err?.error?.message || 'خطا در ذخیره تغییرات.');
        },
      });
  }

  statusClass(status: string): string {
    return (
      this.statusColors[status as OrderStatus] ||
      'bg-white/10 text-white/70 border-white/10'
    );
  }

  // ---- Timeline helpers ----

  stepIndex(status: OrderStatus): number {
    return TIMELINE_STEPS.indexOf(status);
  }

  isStepDone(order: Order, step: OrderStatus): boolean {
    if (order.status === 'cancelled') return false;
    return this.stepIndex(order.status) >= this.stepIndex(step);
  }

  isStepCurrent(order: Order, step: OrderStatus): boolean {
    return order.status === step;
  }

  /** Fixed icon shown on each of the six lifecycle stops in the stepper. */
  stepIconKey(
    step: OrderStatus,
  ): 'clock' | 'check' | 'burger' | 'package' | 'scooter' | 'flag' {
    switch (step) {
      case 'pending':
        return 'clock';
      case 'confirmed':
        return 'check';
      case 'preparing':
        return 'burger';
      case 'ready':
        return 'package';
      case 'delivering':
        return 'scooter';
      default:
        return 'flag';
    }
  }

  journeyBarGradientClass(order: Order): string {
    switch (order.status) {
      case 'pending':
        return 'bg-gradient-to-l from-amber-400 to-amber-500';
      case 'confirmed':
        return 'bg-gradient-to-l from-sky-400 to-sky-500';
      case 'preparing':
        return 'bg-gradient-to-l from-amber-400 to-orange-500';
      case 'ready':
        return 'bg-gradient-to-l from-emerald-400 to-teal-500';
      case 'delivering':
        return 'bg-gradient-to-l from-violet-400 to-fuchsia-500';
      case 'delivered':
        return 'bg-gradient-to-l from-green-400 to-emerald-500';
      default:
        return 'bg-white/20';
    }
  }

  journeyCardClass(order: Order): string {
    switch (order.status) {
      case 'preparing':
        return 'border-orange-400/25 bg-gradient-to-br from-orange-500/10 via-white/5 to-transparent';
      case 'ready':
        return 'border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-white/5 to-transparent';
      case 'delivering':
        return 'border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-white/5 to-transparent';
      default:
        return 'border-white/10 bg-white/5';
    }
  }

  journeyBadgeClass(order: Order): string {
    switch (order.status) {
      case 'preparing':
        return 'bg-orange-500/20 border-orange-300/40 text-orange-200';
      case 'ready':
        return 'bg-emerald-500/20 border-emerald-300/40 text-emerald-200';
      case 'delivering':
        return 'bg-violet-500/20 border-violet-300/40 text-violet-200';
      default:
        return 'bg-amber-500/20 border-amber-300/40 text-amber-200';
    }
  }

  journeyGlowClass(order: Order): string {
    switch (order.status) {
      case 'preparing':
        return 'text-orange-400';
      case 'ready':
        return 'text-emerald-400';
      case 'delivering':
        return 'text-violet-400';
      default:
        return 'text-amber-400';
    }
  }

  journeyTextClass(order: Order): string {
    switch (order.status) {
      case 'preparing':
        return 'text-orange-200';
      case 'ready':
        return 'text-emerald-200';
      case 'delivering':
        return 'text-violet-200';
      default:
        return 'text-white';
    }
  }

  // ---- Live journey / riding-icon progress bar ----

  /** Icon that rides along the progress bar for the order's current status. */
  ridingIcon(
    order: Order,
  ): 'clock' | 'check' | 'burger' | 'scooter-idle' | 'scooter-move' | 'flag' {
    switch (order.status) {
      case 'pending':
        return 'clock';
      case 'confirmed':
        return 'check';
      case 'preparing':
        return 'burger';
      case 'ready':
        return 'scooter-idle';
      case 'delivering':
        return 'scooter-move';
      default:
        return 'flag';
    }
  }

  /** Whether this order currently has a live, ticking countdown to show. */
  hasLiveTracking(order: Order): boolean {
    return (
      order.status === 'preparing' ||
      order.status === 'ready' ||
      order.status === 'delivering'
    );
  }

  private statusStartMs(order: Order): number {
    const raw = order.updated_at || order.created_at;
    const t = raw ? new Date(raw).getTime() : this.now;
    return isNaN(t) ? this.now : t;
  }

  private phaseElapsedSeconds(order: Order): number {
    return Math.max(0, Math.floor((this.now - this.statusStartMs(order)) / 1000));
  }

  private phaseRemainingSeconds(order: Order): number {
    const duration = this.PHASE_ETA_SECONDS[order.status];
    if (!duration) return 0;
    return Math.max(0, duration - this.phaseElapsedSeconds(order));
  }

  /** 0..1 progress within the current phase (used for the riding icon + bar fill). */
  private phaseFraction(order: Order): number {
    const duration = this.PHASE_ETA_SECONDS[order.status];
    if (!duration) return 0.5;
    return Math.min(1, this.phaseElapsedSeconds(order) / duration);
  }

  /** Overall order-journey progress (0..100) across all six lifecycle steps. */
  journeyPercent(order: Order): number {
    if (order.status === 'cancelled') return 0;
    if (order.status === 'delivered') return 100;
    const idx = this.stepIndex(order.status);
    const segments = this.timelineSteps.length - 1;
    if (segments <= 0) return 0;
    const segmentWidth = 100 / segments;
    const pct = idx * segmentWidth + this.phaseFraction(order) * segmentWidth;
    return Math.min(100, Math.max(2, pct));
  }

  /** Clamped offset (in %) used to position the riding-icon badge on the bar. */
  ridingLeftPercent(order: Order): number {
    const pct = Math.min(94, Math.max(6, this.journeyPercent(order)));
    return 100 - pct;
  }

  private formatCountdown(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    return toPersianDigits(`${mm}:${ss}`);
  }

  /** Estimated time remaining (seconds) until the order reaches the customer. */
  private deliveryEtaSeconds(order: Order): number {
    if (order.status === 'ready') {
      const waited = this.phaseElapsedSeconds(order);
      const waitLeft = Math.max(0, this.READY_WAIT_SECONDS - waited);
      return waitLeft + (this.PHASE_ETA_SECONDS['delivering'] || 0);
    }
    if (order.status === 'delivering') {
      return this.phaseRemainingSeconds(order);
    }
    return 0;
  }

  /** Short headline for the live-tracking card. */
  trackingTitle(order: Order): string {
    switch (order.status) {
      case 'preparing':
        return 'در حال آماده‌سازی سفارش شما';
      case 'ready':
        return 'سفارش شما آماده تحویل است';
      case 'delivering':
        return 'پیک در راه است 🛵';
      default:
        return '';
    }
  }

  /** Main live countdown sentence, ticking every second. */
  countdownLabel(order: Order): string {
    if (order.status === 'preparing') {
      const rem = this.phaseRemainingSeconds(order);
      if (rem <= 0) {
        return 'کمی بیشتر از حد معمول طول می‌کشد؛ آشپز با دقت مشغول آماده‌سازی است 🍳';
      }
      return `غذای شما تا ${this.formatCountdown(rem)} دیگر آماده می‌شود`;
    }
    if (order.status === 'delivering') {
      const rem = this.phaseRemainingSeconds(order);
      if (rem <= 0) {
        return 'پیک تا لحظاتی دیگر به آدرس شما می‌رسد';
      }
      return `سفارش شما تا ${this.formatCountdown(rem)} دیگر به دستتان می‌رسد`;
    }
    if (order.status === 'ready') {
      const rem = this.deliveryEtaSeconds(order);
      return `سفارش شما تا ${this.formatCountdown(rem)} دیگر به دستتان می‌رسد`;
    }
    return '';
  }

  // ---- Receipt ----

  toggleReceipt(orderId: number): void {
    this.receiptId = this.receiptId === orderId ? null : orderId;
  }

  // ---- Reorder ----

  reorder(order: Order): void {
    if (!order.items?.length) {
      this.toast.error('این سفارش اقلامی ندارد.');
      return;
    }
    this.reorderingId = order.order_ID;
    const productIds = order.items.map((i) => i.product_ID);

    // Fetch current products to get live price/availability
    this.productService.getProducts?.() // may vary by API
      ? this.productService.getProducts().subscribe({
          next: (res: any) => {
            const list: FoodMODEL[] =
              res?.data?.products || res?.data || res?.products || [];
            const byId = new Map(
              list.map((p: any) => [Number(p.product_ID), p]),
            );
            let added = 0;
            for (const item of order.items!) {
              const live = byId.get(Number(item.product_ID));
              if (live) {
                this.cartService.addToCart(live as FoodMODEL, item.quantity);
                added++;
              } else {
                // Fallback: reconstruct minimal product from historical data
                const fallback = {
                  product_ID: String(item.product_ID),
                  title: item.product_title,
                  price: String(item.product_price),
                  description: '',
                  category: '',
                  image: item.image || '',
                } as unknown as FoodMODEL;
                this.cartService.addToCart(fallback, item.quantity);
                added++;
              }
            }
            this.reorderingId = null;
            this.toast.success(
              `${toPersianDigits(added)} قلم به سبد خرید اضافه شد.`,
            );
          },
          error: () => {
            // Fallback without live fetch
            for (const item of order.items!) {
              const fallback = {
                product_ID: String(item.product_ID),
                title: item.product_title,
                price: String(item.product_price),
                description: '',
                category: '',
                image: item.image || '',
              } as unknown as FoodMODEL;
              this.cartService.addToCart(fallback, item.quantity);
            }
            this.reorderingId = null;
            this.toast.success('اقلام به سبد خرید اضافه شدند.');
          },
        })
      : (() => {
          for (const item of order.items!) {
            const fallback = {
              product_ID: String(item.product_ID),
              title: item.product_title,
              price: String(item.product_price),
              description: '',
              category: '',
              image: item.image || '',
            } as unknown as FoodMODEL;
            this.cartService.addToCart(fallback, item.quantity);
          }
          this.reorderingId = null;
          this.toast.success('اقلام به سبد خرید اضافه شدند.');
        })();
  }

  toPersian(v: string | number): string {
    return toPersianDigits(v);
  }
}
