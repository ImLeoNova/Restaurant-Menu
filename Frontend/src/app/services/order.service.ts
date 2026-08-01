import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  AdminOrdersResponse, CreateOrderPayload, CreateOrderResponse, Order, OrderStatus,
} from '../interfaces/order';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiBase = environment.websiteAPI;
  constructor(private http: HttpClient) {}
  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }
  createOrder(payload: CreateOrderPayload): Observable<ApiResponse<CreateOrderResponse>> {
    return this.http.post<ApiResponse<CreateOrderResponse>>(
      `${this.apiBase}/api/orders/create`, payload,
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }
  getMyOrders(): Observable<ApiResponse<Order[]>> {
    return this.http.get<ApiResponse<Order[]>>(`${this.apiBase}/api/orders/my`, { withCredentials: true });
  }
  getOrder(orderId: number): Observable<ApiResponse<Order>> {
    return this.http.get<ApiResponse<Order>>(`${this.apiBase}/api/orders/${orderId}`, { withCredentials: true });
  }
  adminListOrders(opts?: { status?: string; page?: number; per_page?: number }): Observable<ApiResponse<AdminOrdersResponse>> {
    let params = new HttpParams();
    if (opts?.status) params = params.set('status', opts.status);
    if (opts?.page) params = params.set('page', String(opts.page));
    if (opts?.per_page) params = params.set('per_page', String(opts.per_page));
    return this.http.get<ApiResponse<AdminOrdersResponse>>(
      `${this.apiBase}/api/admin/orders`, { params, withCredentials: true },
    );
  }
  adminUpdateOrder(orderId: number, body: { status?: string; admin_note?: string }): Observable<ApiResponse<Order>> {
    return this.http.patch<ApiResponse<Order>>(
      `${this.apiBase}/api/admin/orders/${orderId}`, body,
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }
}
