import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ApiResponse } from '../models/api-response';
import {
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
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
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

  addComment(
    productId: number,
    payload: CreateCommentPayload,
  ): Observable<ApiResponse<ProductComment>> {
    return this.http.post<ApiResponse<ProductComment>>(
      `${this.API}/${productId}/comments`,
      payload,
      { headers: this.getAuthHeaders() },
    );
  }

  updateComment(
    commentId: number,
    payload: Partial<CreateCommentPayload>,
  ): Observable<ApiResponse<ProductComment>> {
    return this.http.put<ApiResponse<ProductComment>>(
      `${this.API}/comments/${commentId}`,
      payload,
      { headers: this.getAuthHeaders() },
    );
  }

  deleteComment(commentId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.API}/comments/${commentId}`,
      { headers: this.getAuthHeaders() },
    );
  }
}
