export interface ReportRange {
  start: string;
  end: string;
  compare_start: string;
  compare_end: string;
}

export interface OperationalKpis {
  orders_total: number;
  orders_total_prev: number;
  new_users: number;
  new_users_prev: number;
  avg_rating: number;
}

export interface StatusCount {
  status: string;
  label: string;
  count: number;
}

export interface ProductQuantity {
  product_ID: number;
  title: string;
  quantity: number;
}

export interface CategoryQuantity {
  category: string;
  quantity: number;
}

export interface DateCount {
  date: string;
  count: number;
}

export interface RatingPoint {
  week_start: string;
  avg_rating: number;
}

export interface StuckOrder {
  order_ID: number;
  status: string;
  hours_stuck: number;
  recipient_name: string;
}

export interface OperationalReport {
  range: ReportRange;
  kpis: OperationalKpis;
  orders_by_status: StatusCount[];
  top_products_by_quantity: ProductQuantity[];
  sales_by_category_quantity: CategoryQuantity[];
  new_users_trend: DateCount[];
  rating_trend: RatingPoint[];
  avg_fulfillment_minutes: number;
  stuck_orders: StuckOrder[];
}

export interface FinancialKpis {
  revenue_total: number;
  revenue_total_prev: number;
  average_order_value: number;
  average_order_value_prev: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
}

export interface TopCustomer {
  user_ID: string;
  username: string;
  total_spent: number;
  orders_count: number;
}

export interface RepeatVsNew {
  repeat_customers: number;
  new_customers: number;
  repeat_revenue_share: number;
}

export interface PaymentFunnel {
  intents_created: number;
  orders_completed: number;
  abandonment_rate: number;
}

export interface FinancialReport {
  range: ReportRange;
  kpis: FinancialKpis;
  revenue_trend: RevenuePoint[];
  revenue_by_category: CategoryRevenue[];
  top_customers: TopCustomer[];
  repeat_vs_new: RepeatVsNew;
  payment_funnel: PaymentFunnel;
}

export interface WeeklySummaryResponse {
  week_start: string | null;
  week_end: string | null;
  summary: string | null;
  generated_at: string | null;
  available: boolean;
}

export type ReportRangeKey = 'today' | '7d' | '30d' | 'custom';
