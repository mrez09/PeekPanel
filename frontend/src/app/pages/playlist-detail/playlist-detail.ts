import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Playlist, PlaylistService } from '../../services/playlist.service';
import { PeekService } from '../../services/peek.service';

interface Peek {
  id: number;
  title: string;
  content: string;
  category_id: number;
  category_name: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-playlist-detail',
  imports: [DatePipe],
  templateUrl: './playlist-detail.html',
  styleUrl: './playlist-detail.css',
})
export class PlaylistDetail implements OnInit {
  playlist = signal<Playlist | null>(null);
  errorMessage = signal('');

  availablePeeks = signal<Peek[]>([]);
  selectedPeekIds = signal<number[]>([]);
  showAddPeek = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playlistService: PlaylistService,
    private peekService: PeekService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Playlist tidak ditemukan.');
      return;
    }

    this.playlistService.getPlaylist(id).subscribe({
      next: (data) => {
        this.playlist.set(data);
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil detail playlist.');
      },
    });
  }

  goBack() {
    this.router.navigate(['/playlists']);
  }

  deletePlaylist() {
    const currentPlaylist = this.playlist();

    if (!currentPlaylist) {
      return;
    }

    const confirmed = confirm(`Yakin ingin menghapus "${currentPlaylist.name}"?`);

    if (!confirmed) {
      return;
    }

    this.playlistService.deletePlaylist(currentPlaylist.id).subscribe({
      next: () => {
        this.router.navigate(['/playlists']);
      },
      error: () => {
        this.errorMessage.set('Gagal menghapus playlist.');
      },
    });
  }

  openAddPeek() {
    this.peekService.getPeeks().subscribe({
      next: (data) => {
        this.availablePeeks.set(data);
        this.selectedPeekIds.set([]);
        this.showAddPeek.set(true);
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil daftar Peek.');
      },
    });
  }

  closeAddPeek() {
    this.showAddPeek.set(false);
  }

  togglePeek(peekId: number) {
    this.selectedPeekIds.update((ids) => {
      if (ids.includes(peekId)) {
        return ids.filter((id) => id !== peekId);
      }

      return [...ids, peekId];
    });
  }

  addSelectedPeeks() {
    console.log('Peek yang dipilih:', this.selectedPeekIds());
    this.showAddPeek.set(false);
  }
}
