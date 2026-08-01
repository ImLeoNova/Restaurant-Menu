import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../services/order.service';
import { ToastService } from '../../../../services/toast.service';
import { Order, OrderStatus, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../../../interfaces/order';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dashboard-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-orders.component.html',
})
export class DashboardOrdersComponent implements OnChanges {
  @Input({ required: true }) isAdmin = false;
  @Input() userRole = 'User';

  orders: Order[] = [];
  loading = false;
  expandedId: number | null = null;
  statusFilter = '';
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusColors = ORDER_STATUS_COLORS;
  readonly allStatuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
  editStatus: Record<number, string> = {};
  editNote: Record<number, string> = {};
  savingId: number | null = null;

  constructor(private orderService: OrderService, private toast: ToastService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isAdmin'] || changes['userRole']) this.load();
  }

  load(): void {
    this.loading = true;
    if (this.isAdmin) {
      this.orderService.adminListOrders({ status: this.statusFilter || undefined, page: 1, per_page: 50 }).subscribe({
        next: (res) => {
          this.orders = res?.data?.orders || [];
          this.orders.forEach((o) => {
            this.editStatus[o.order_ID] = o.status;
            this.editNote[o.order_ID] = o.admin_note || '';
          });
          this.loading = false;
        },
        error: () => { this.loading = false; this.toast.error('دریافت سفارش‌ها ناموفق بود.'); },
      });
    } else {
      this.orderService.getMyOrders().subscribe({
        next: (res) => { this.orders = res?.data || []; this.loading = false; },
        error: () => { this.loading = false; this.toast.error('دریافت سفارش‌ها ناموفق بود.'); },
      });
    }
  }

  onFilterChange(): void { this.load(); }
  toggle(id: number): void { this.expandedId = this.expandedId === id ? null : id; }

  imageUrl(path?: string): string {
    if (!path) return 'assets/web/logo.png';
    if (path.startsWith('http')) return path;
    return `${environment.websiteAPI || ''}/${path}`.replace(/([^:]\/)\/+/g, '$1');
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('fa-IR'); } catch { return iso; }
  }

  save(order: Order): void {
    if (!this.isAdmin) return;
    this.savingId = order.order_ID;
    this.orderService.adminUpdateOrder(order.order_ID, {
      status: this.editStatus[order.order_ID],
      admin_note: this.editNote[order.order_ID],
    }).subscribe({
      next: (res) => {
        this.savingId = null;
        this.toast.success(res?.message || 'سفارش به‌روزرسانی شد.');
        if (res?.data) {
          const idx = this.orders.findIndex((o) => o.order_ID === order.order_ID);
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
    return this.statusColors[status as OrderStatus] || 'bg-white/10 text-white/70 border-white/10';
  }
}
