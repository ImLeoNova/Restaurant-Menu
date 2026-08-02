import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  OperationalReport,
  FinancialReport,
  WeeklySummaryResponse,
  ReportRangeKey,
} from '../interfaces/report';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly apiBase = environment.websiteAPI;

  constructor(private http: HttpClient) {}

  getOperational(
    range: ReportRangeKey = '7d',
    start?: string,
    end?: string,
  ): Observable<ApiResponse<OperationalReport>> {
    let params = new HttpParams().set('range', range);
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<ApiResponse<OperationalReport>>(
      `${this.apiBase}/api/admin/reports/operational`,
      { params, withCredentials: true },
    );
  }

  getFinancial(
    range: ReportRangeKey = '7d',
    start?: string,
    end?: string,
  ): Observable<ApiResponse<FinancialReport>> {
    let params = new HttpParams().set('range', range);
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<ApiResponse<FinancialReport>>(
      `${this.apiBase}/api/admin/reports/financial`,
      { params, withCredentials: true },
    );
  }

  getWeeklySummary(): Observable<ApiResponse<WeeklySummaryResponse>> {
    return this.http.get<ApiResponse<WeeklySummaryResponse>>(
      `${this.apiBase}/api/admin/reports/weekly-summary`,
      { withCredentials: true },
    );
  }

  generateWeeklySummary(force = true): Observable<ApiResponse<WeeklySummaryResponse>> {
    return this.http.post<ApiResponse<WeeklySummaryResponse>>(
      `${this.apiBase}/api/admin/reports/weekly-summary/generate`,
      { force },
      { withCredentials: true },
    );
  }
}
