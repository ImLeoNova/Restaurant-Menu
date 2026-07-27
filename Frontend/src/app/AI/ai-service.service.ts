import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AIModel } from './AIModel/aimodel';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { AIResponse } from '../interfaces/interfaces';
import { ApiResponse } from '../models/api-response';

interface aiModel {
  status: number;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiServiceService {
  apiURL: string = environment.aiAPI;
  constructor(private http: HttpClient) {}

  getAIMessage(
    message: string | null,
    token: string,
  ): Observable<ApiResponse<AIResponse>> {
    return this.http.post<ApiResponse<AIResponse>>(
      this.apiURL,
      { message },
      {
        withCredentials: true,
      },
    );
  }
}
