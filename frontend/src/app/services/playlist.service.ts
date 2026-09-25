import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlaylistService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPlaylists(): Observable<Playlist[]> {
    const token = localStorage.getItem('token');

    return this.http.get<Playlist[]>(`${this.apiUrl}/playlists`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  getPlaylist(id: number): Observable<Playlist> {
    const token = localStorage.getItem('token');

    return this.http.get<Playlist>(`${this.apiUrl}/playlists/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  createPlaylist(data: CreatePlaylistRequest): Observable<{ message: string; id: number }> {
    const token = localStorage.getItem('token');

    return this.http.post<{ message: string; id: number }>(`${this.apiUrl}/playlists`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  updatePlaylist(id: number, data: CreatePlaylistRequest): Observable<{ message: string }> {
    const token = localStorage.getItem('token');

    return this.http.put<{ message: string }>(`${this.apiUrl}/playlists/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  deletePlaylist(id: number): Observable<{ message: string }> {
    const token = localStorage.getItem('token');

    return this.http.delete<{ message: string }>(`${this.apiUrl}/playlists/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
