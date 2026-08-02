import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../../services/report.service';
import { ToastService } from '../../../../services/toast.service';
import {
  OperationalReport,
  FinancialReport,
  WeeklySummaryResponse,
  ReportRangeKey,
} from '../../../../interfaces/report';
import { BaseChartComponent } from '../charts/base-chart/base-chart.component';
import {
  PersianNumberPipe,
  TomanPipe,
  toPersianDigits,
  formatToman,
} from '../../../../pipes/persian-number.pipe';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  OrderStatus,
} from '../../../../interfaces/order';
import { Roles } from '../../../../enums/enums';

const CHART_COLORS = {
  amber: 'rgba(245, 158, 11, 0.85)',
  green: 'rgba(34, 197, 94, 0.85)',
  cyan: 'rgba(6, 182, 212, 0.85)',
  fuchsia: 'rgba(217, 70, 239, 0.85)',
  rose: 'rgba(244, 63, 94, 0.85)',
  violet: 'rgba(139, 92, 246, 0.85)',
  sky: 'rgba(14, 165, 233, 0.85)',
  orange: 'rgba(249, 115, 22, 0.85)',
};

@Component({
  selector: 'app-dashboard-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartComponent,
    PersianNumberPipe,
    TomanPipe,
  ],
  templateUrl: './dashboard-reports.component.html',
})
export class DashboardReportsComponent implements OnInit {
  @Input() userRole = 'User';
  @Output() filterOrdersByStatus = new EventEmitter<string>();
  @Output() openOrder = new EventEmitter<number>();

  range: ReportRangeKey = '7d';
  customStart = '';
  customEnd = '';
  loading = false;
  error: string | null = null;

  operational: OperationalReport | null = null;
  financial: FinancialReport | null = null;
  weekly: WeeklySummaryResponse | null = null;
  weeklyLoading = false;

  readonly rangeOptions: { key: ReportRangeKey; label: string }[] = [
    { key: 'today', label: 'امروز' },
    { key: '7d', label: '۷ روز اخیر' },
    { key: '30d', label: '۳۰ روز اخیر' },
    { key: 'custom', label: 'بازه دلخواه' },
  ];

  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusColors = ORDER_STATUS_COLORS;

  constructor(
    private reportService: ReportService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.loadWeekly();
  }

  get isFounder(): boolean {
    return String(this.userRole).toLowerCase() === 'founder';
  }

  get isAdminOrFounder(): boolean {
    const r = String(this.userRole).toLowerCase();
    return r === 'admin' || r === 'founder';
  }

  statusLabel(status: string): string {
    return this.statusLabels[status as OrderStatus] || status;
  }

  setRange(key: ReportRangeKey): void {
    this.range = key;
    if (key !== 'custom') this.loadAll();
  }

  applyCustomRange(): void {
    if (!this.customStart || !this.customEnd) {
      this.toast.error('بازه تاریخ را مشخص کنید.');
      return;
    }
    this.range = 'custom';
    this.loadAll();
  }

  loadAll(): void {
    if (!this.isAdminOrFounder) return;
    this.loading = true;
    this.error = null;

    const start = this.range === 'custom' ? this.customStart : undefined;
    const end = this.range === 'custom' ? this.customEnd : undefined;

    this.reportService.getOperational(this.range, start, end).subscribe({
      next: (res) => {
        this.operational = res?.data || null;
        this.loading = false;
        this.rebuildCharts();
      },
      error: () => {
        this.loading = false;
        this.error = 'دریافت گزارش عملیاتی ناموفق بود.';
        this.toast.error(this.error);
      },
    });

    if (this.isFounder) {
      this.reportService.getFinancial(this.range, start, end).subscribe({
        next: (res) => {
          this.financial = res?.data || null;
          this.rebuildCharts();
        },
        error: () => {
          this.toast.error('دریافت گزارش مالی ناموفق بود.');
        },
      });
    }
  }

  loadWeekly(): void {
    if (!this.isAdminOrFounder) return;
    this.weeklyLoading = true;
    this.reportService.getWeeklySummary().subscribe({
      next: (res) => {
        this.weekly = res?.data || null;
        this.weeklyLoading = false;
      },
      error: () => {
        this.weeklyLoading = false;
        this.weekly = {
          week_start: null,
          week_end: null,
          summary: null,
          generated_at: null,
          available: false,
        };
      },
    });
  }

  generateWeekly(): void {
    if (!this.isFounder) return;
    this.weeklyLoading = true;
    this.reportService.generateWeeklySummary(true).subscribe({
      next: (res) => {
        this.weekly = res?.data || null;
        this.weeklyLoading = false;
        this.toast.success('خلاصه هفتگی تولید شد.');
      },
      error: () => {
        this.weeklyLoading = false;
        this.toast.error('تولید خلاصه هفتگی ناموفق بود.');
      },
    });
  }

  deltaPct(curr: number, prev: number): number | null {
    if (!prev) return null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  deltaClass(curr: number, prev: number): string {
    const d = this.deltaPct(curr, prev);
    if (d == null) return 'text-white/50';
    return d >= 0 ? 'text-green-300' : 'text-rose-300';
  }

  formatDelta(curr: number, prev: number): string {
    const d = this.deltaPct(curr, prev);
    if (d == null) return '—';
    const sign = d > 0 ? '+' : '';
    return toPersianDigits(`${sign}${d}٪`);
  }

  // ---------- Chart data ----------
  // These are plain stored properties, NOT getters. They are computed once,
  // by rebuildCharts(), whenever operational/financial data actually changes
  // (see loadAll()/loadWeekly()). Template bindings like [data]="chartX" must
  // receive a stable object reference between change-detection cycles -
  // otherwise BaseChartComponent's ngOnChanges fires on every CD tick (any
  // click, timer, or hover anywhere in the app) and destroys/recreates every
  // Chart.js instance in a tight loop, which is why charts never finished
  // rendering and the rest of the Admin Panel became unresponsive.
  ordersByStatusChart: any = { labels: [], datasets: [] };
  topProductsChart: any = { labels: [], datasets: [] };
  categoryChart: any = { labels: [], datasets: [] };
  newUsersChart: any = { labels: [], datasets: [] };
  ratingChart: any = { labels: [], datasets: [] };
  revenueChart: any = { labels: [], datasets: [] };
  repeatChart: any = { labels: [], datasets: [] };
  funnelChart: any = { labels: [], datasets: [] };

  get categoryChartTitle(): string {
    return this.isFounder
      ? 'درآمد بر اساس دسته‌بندی'
      : 'فروش بر اساس دسته‌بندی (تعداد)';
  }

  private rebuildCharts(): void {
    this.ordersByStatusChart = this.buildOrdersByStatusChart();
    this.topProductsChart = this.buildTopProductsChart();
    this.categoryChart = this.buildCategoryChart();
    this.newUsersChart = this.buildNewUsersChart();
    this.ratingChart = this.buildRatingChart();
    this.revenueChart = this.buildRevenueChart();
    this.repeatChart = this.buildRepeatChart();
    this.funnelChart = this.buildFunnelChart();
  }

  private buildOrdersByStatusChart() {
    const items = this.operational?.orders_by_status || [];
    const colors = [
      CHART_COLORS.amber,
      CHART_COLORS.sky,
      CHART_COLORS.orange,
      CHART_COLORS.green,
      CHART_COLORS.violet,
      CHART_COLORS.cyan,
      CHART_COLORS.rose,
    ];
    return {
      labels: items.map((i) => i.label),
      datasets: [
        {
          data: items.map((i) => i.count),
          backgroundColor: colors.slice(0, items.length),
          borderWidth: 0,
        },
      ],
    };
  }

  private buildTopProductsChart() {
    const items = [
      ...(this.operational?.top_products_by_quantity || []),
    ].reverse();
    return {
      labels: items.map((i) => i.title),
      datasets: [
        {
          label: 'تعداد',
          data: items.map((i) => i.quantity),
          backgroundColor: CHART_COLORS.amber,
          borderRadius: 6,
        },
      ],
    };
  }

  private buildCategoryChart() {
    if (this.isFounder && this.financial) {
      const items = this.financial.revenue_by_category || [];
      return {
        labels: items.map((i) => i.category),
        datasets: [
          {
            label: 'درآمد (تومان)',
            data: items.map((i) => i.revenue),
            backgroundColor: CHART_COLORS.fuchsia,
            borderRadius: 6,
          },
        ],
      };
    }
    const items = this.operational?.sales_by_category_quantity || [];
    return {
      labels: items.map((i) => i.category),
      datasets: [
        {
          label: 'تعداد',
          data: items.map((i) => i.quantity),
          backgroundColor: CHART_COLORS.cyan,
          borderRadius: 6,
        },
      ],
    };
  }

  private buildNewUsersChart() {
    const items = this.operational?.new_users_trend || [];
    return {
      labels: items.map((i) => i.date),
      datasets: [
        {
          label: 'کاربران جدید',
          data: items.map((i) => i.count),
          borderColor: CHART_COLORS.green,
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }

  private buildRatingChart() {
    const items = this.operational?.rating_trend || [];
    return {
      labels: items.map((i) => i.week_start),
      datasets: [
        {
          label: 'میانگین امتیاز',
          data: items.map((i) => i.avg_rating),
          borderColor: CHART_COLORS.violet,
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }

  private buildRevenueChart() {
    const items = this.financial?.revenue_trend || [];
    return {
      labels: items.map((i) => i.date),
      datasets: [
        {
          label: 'درآمد (تومان)',
          data: items.map((i) => i.revenue),
          borderColor: CHART_COLORS.fuchsia,
          backgroundColor: 'rgba(217, 70, 239, 0.12)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }

  private buildRepeatChart() {
    const r = this.financial?.repeat_vs_new;
    if (!r) return { labels: [], datasets: [] };
    return {
      labels: ['مشتری تکراری', 'مشتری جدید'],
      datasets: [
        {
          data: [r.repeat_customers, r.new_customers],
          backgroundColor: [CHART_COLORS.green, CHART_COLORS.sky],
          borderWidth: 0,
        },
      ],
    };
  }

  private buildFunnelChart() {
    const f = this.financial?.payment_funnel;
    if (!f) return { labels: [], datasets: [] };
    return {
      labels: ['شروع پرداخت', 'سفارش تکمیل‌شده'],
      datasets: [
        {
          label: 'تعداد',
          data: [f.intents_created, f.orders_completed],
          backgroundColor: [CHART_COLORS.amber, CHART_COLORS.green],
          borderRadius: 6,
        },
      ],
    };
  }

  barOptions = {
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.6)' },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.75)' },
        grid: { display: false },
      },
    },
  };

  verticalBarOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.6)' },
        grid: { display: false },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.6)' },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  lineOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.55)', maxRotation: 0 },
        grid: { display: false },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.55)' },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  doughnutOptions = {
    plugins: {
      legend: { position: 'bottom' as const },
    },
  };

  onStatusClick(status: string): void {
    this.filterOrdersByStatus.emit(status);
  }

  onStuckClick(orderId: number): void {
    this.openOrder.emit(orderId);
  }

  statusBadgeClass(status: string): string {
    return (
      this.statusColors[status as OrderStatus] || 'bg-white/10 text-white/70'
    );
  }

  toPersian(v: string | number): string {
    return toPersianDigits(v);
  }

  toman(v: number): string {
    return formatToman(v);
  }
}
