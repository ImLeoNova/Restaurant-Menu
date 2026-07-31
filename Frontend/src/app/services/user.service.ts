import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { LoginResponse, RegisterResponse } from '../interfaces/interfaces';
import { UpdateProfilePayload } from '../interfaces/UpdateProfilePayload';
import { ChangePasswordPayload } from '../interfaces/ChangePasswordPayload';
import { CompleteProfilePayload } from '../interfaces/CompleteProfilePayload';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiBase: string = environment.websiteAPI;
  private readonly avatarUrlSubject = new BehaviorSubject<string | null>(null);

  readonly avatarUrl$ = this.avatarUrlSubject.asObservable();

  constructor(private http: HttpClient) {}

  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  // Phone OTP Auth
  sendOtp(phone: string): Observable<ApiResponse<{ phone: string; expires_in: number }>> {
    return this.http.post<ApiResponse<{ phone: string; expires_in: number }>>(
      `${this.apiBase}/api/auth/otp/send`,
      { phone },
      { headers: this.jsonHeaders() },
    );
  }

  verifyOtp(
    phone: string,
    code: string,
  ): Observable<ApiResponse<{ phone: string; verification_token: string; expires_in: number }>> {
    return this.http.post<
      ApiResponse<{ phone: string; verification_token: string; expires_in: number }>
    >(
      `${this.apiBase}/api/auth/otp/verify`,
      { phone, code },
      { headers: this.jsonHeaders() },
    );
  }

  checkUsername(
    username: string,
  ): Observable<ApiResponse<{ available: boolean; reason: string | null }>> {
    return this.http.post<ApiResponse<{ available: boolean; reason: string | null }>>(
      `${this.apiBase}/api/auth/username/check`,
      { username },
      { headers: this.jsonHeaders() },
    );
  }

  registerWithPhone(payload: {
    username: string;
    password: string;
    phone: string;
    verification_token: string;
  }): Observable<ApiResponse<{ token?: string }>> {
    return this.http.post<ApiResponse<{ token?: string }>>(
      `${this.apiBase}/api/user/register`,
      payload,
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }

  // Auth
  registerUser(user: User): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.apiBase}/api/user/register`,
      { username: user.username, password: user.password, email: user.email },
      { headers: this.jsonHeaders() },
    );
  }

  loginUser(user: User): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.apiBase}/api/user/login`,
      { username: user.username, password: user.password },
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }

  isTokenValid(): Observable<ApiResponse<{ token: string }>> {
    return this.http.post<ApiResponse<{ token: string }>>(
      `${this.apiBase}/api/user/verify-token`,
      {},
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }

  // Profile
  getMyProfile(token: string | null = null): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiBase}/api/user/me`, {
      withCredentials: true,
    });
  }

  updateProfile(
    token: string | null,
    payload: UpdateProfilePayload,
  ): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(
      `${this.apiBase}/api/user/update-profile`,
      payload,
      { withCredentials: true },
    );
  }

  completeProfile(
    payload: CompleteProfilePayload,
  ): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(
      `${this.apiBase}/api/user/update-profile`,
      payload,
      { withCredentials: true },
    );
  }

  setCurrentAvatarUrl(url: string | null): void {
    this.avatarUrlSubject.next(url);
  }

  uploadAvatar(file: File): Observable<ApiResponse<{ avatar: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<{ avatar: string }>>(
      `${this.apiBase}/api/user/avatar`,
      formData,
      { withCredentials: true },
    );
  }

  deleteAvatar(): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiBase}/api/user/avatar`,
      { withCredentials: true },
    );
  }

  changePassword(
    token: string | null,
    payload: ChangePasswordPayload,
  ): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.apiBase}/api/user/change-password`,
      payload,
      { withCredentials: true },
    );
  }

  deleteMyAccount(token: string | null): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.apiBase}/api/user/delete-me`,
      { withCredentials: true },
    );
  }

  logout(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${this.apiBase}/api/user/logout`,
      {},
      { withCredentials: true },
    );
  }

  // Admin
  adminGetAllUsers(token: string | null): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(
      `${this.apiBase}/api/admin/users`,
      { withCredentials: true },
    );
  }

  adminCreateUser(
    token: string | null,
    user: User & { role?: string },
  ): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiBase}/api/admin/user/create`,
      {
        username: user.username,
        password: user.password,
        email: user.email,
        role: user.role ?? 'user',
      },
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }

  adminUpdateUser(
    token: string | null,
    userId: string,
    payload: UpdateProfilePayload,
  ): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(
      `${this.apiBase}/api/admin/user/${userId}`,
      payload,
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }

  adminDeleteUser(
    token: string | null,
    userId: string | undefined,
  ): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.apiBase}/api/admin/user/${userId}`,
      { headers: this.jsonHeaders(), withCredentials: true },
    );
  }
}
