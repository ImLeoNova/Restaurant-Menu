import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
})
export class DashboardOrdersComponent implements OnChanges {
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
