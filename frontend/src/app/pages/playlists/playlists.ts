import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Playlist, PlaylistService } from '../../services/playlist.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-playlists',
  imports: [DatePipe],
  templateUrl: './playlists.html',
  styleUrl: './playlists.css',
})
export class Playlists implements OnInit {
  playlists = signal<Playlist[]>([]);
  showCreateForm = signal(false);

  name = signal('');
  description = signal('');

  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private playlistService: PlaylistService,
    private router: Router,
  ) {}

  openPlaylist(id: number) {
    this.router.navigate(['/playlists', id]);
  }

  ngOnInit() {
    this.loadPlaylists();
  }

  loadPlaylists() {
    this.playlistService.getPlaylists().subscribe({
      next: (data) => {
        this.playlists.set(data);
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil playlist.');
      },
    });
  }

  toggleCreateForm() {
    this.showCreateForm.update((value) => !value);

    this.errorMessage.set('');
    this.successMessage.set('');
  }

  createPlaylist() {
    const playlistName = this.name().trim();
    const playlistDescription = this.description().trim();

    if (!playlistName) {
      this.errorMessage.set('Nama playlist wajib diisi.');
      return;
    }

    this.playlistService
      .createPlaylist({
        name: playlistName,
        description: playlistDescription || undefined,
      })
      .subscribe({
        next: () => {
          this.name.set('');
          this.description.set('');
          this.showCreateForm.set(false);
          this.successMessage.set('Playlist berhasil dibuat.');
          this.loadPlaylists();
        },
        error: () => {
          this.errorMessage.set('Gagal membuat playlist.');
        },
      });
  }
}
