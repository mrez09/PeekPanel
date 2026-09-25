import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface Peek {
  id: number;
  title: string;
  content: string;
  category_id: number;
  category_name: string;
  created_at: string;
  updated_at: string;
}

interface CreatePeekRequest {
  title: string;
  content: string;
  category_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class PeekService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPeeks(): Observable<Peek[]> {
    const token = localStorage.getItem('token');

    return this.http.get<Peek[]>(`${this.apiUrl}/peeks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  getPeek(id: number): Observable<Peek> {
    const token = localStorage.getItem('token');

    return this.http.get<Peek>(`${this.apiUrl}/peeks/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  getCategories(): Observable<{ id: number; name: string }[]> {
    const token = localStorage.getItem('token');

    return this.http.get<{ id: number; name: string }[]>(`${this.apiUrl}/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  createPeek(data: CreatePeekRequest): Observable<{ message: string; id: number }> {
    const token = localStorage.getItem('token');

    return this.http.post<{ message: string; id: number }>(`${this.apiUrl}/peeks`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  updatePeek(
    id: number,
    data: {
      title: string;
      content: string;
      category_id: number;
    },
  ): Observable<{ message: string }> {
    const token = localStorage.getItem('token');

    return this.http.put<{ message: string }>(`${this.apiUrl}/peeks/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  deletePeek(id: number): Observable<{ message: string }> {
    const token = localStorage.getItem('token');

    return this.http.delete<{ message: string }>(`${this.apiUrl}/peeks/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
