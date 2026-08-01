export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'delivering' | 'delivered' | 'cancelled';

export interface OrderItem {
  item_ID: number;
  product_ID: number;
  product_title: string;
  product_price: number;
  quantity: number;
  image: string;
  line_total: number;
}

export interface Order {
  order_ID: number;
  user_ID: string;
  total_amount: number;
  status: OrderStatus;
  status_label: string;
  authority?: string;
  ref_id?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items?: OrderItem[];
}

export interface CreateOrderPayload {
  items: { product_ID: number | string; quantity: number }[];
}

export interface CreateOrderResponse {
  payment_url: string;
  authority: string;
  total_amount: number;
  amount_rials: number;
}

export interface AdminOrdersResponse {
  orders: Order[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در حال بررسی',
  confirmed: 'تأیید شده',
  preparing: 'در حال آماده‌سازی',
  ready: 'آماده تحویل',
  delivering: 'در حال ارسال',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  confirmed: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  preparing: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  delivering: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
  delivered: 'bg-green-500/20 text-green-300 border-green-400/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-400/30',
};
