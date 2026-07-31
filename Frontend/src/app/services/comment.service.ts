import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  CommentsSummary,
  CreateCommentPayload,
  ProductComment,
  ProductCommentsResponse,
} from '../models/comment-model';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private API = environment.websiteAPI + '/api/product';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  getComments(
    productId: number,
    limit = 50,
    offset = 0,
  ): Observable<ApiResponse<ProductCommentsResponse>> {
    return this.http.get<ApiResponse<ProductCommentsResponse>>(
      `${this.API}/${productId}/comments?limit=${limit}&offset=${offset}`,
    );
  }

  getSummary(productId: number): Observable<ApiResponse<CommentsSummary>> {
    return this.http.get<ApiResponse<CommentsSummary>>(
      `${this.API}/${productId}/comments/summary`,
    );
  }

  addComment(
    productId: number,
    payload: CreateCommentPayload,
  ): Observable<ApiResponse<ProductComment>> {
    return this.http.post<ApiResponse<ProductComment>>(
      `${this.API}/${productId}/comments`,
      payload,
      { headers: this.getAuthHeaders(), withCredentials: true },
    );
  }

  updateComment(
    commentId: number,
    payload: Partial<CreateCommentPayload>,
  ): Observable<ApiResponse<ProductComment>> {
    return this.http.put<ApiResponse<ProductComment>>(
      `${this.API}/comments/${commentId}`,
      payload,
      { headers: this.getAuthHeaders(), withCredentials: true },
    );
  }

  deleteComment(commentId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.API}/comments/${commentId}`,
      { headers: this.getAuthHeaders(), withCredentials: true },
    );
  }
}
