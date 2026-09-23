import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface MeResponse {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password,
    });
  }

  getMe(): Observable<MeResponse> {
    const token = localStorage.getItem('token');

    return this.http.get<MeResponse>(`${this.apiUrl}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
