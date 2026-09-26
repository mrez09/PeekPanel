import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Playlist, PlaylistPeek, PlaylistService } from '../../services/playlist.service';

@Component({
  selector: 'app-playlist-peek',
  templateUrl: './playlist-peek.html',
  styleUrl: './playlist-peek.css',
})
export class PlaylistPeekPage implements OnInit {
  playlist = signal<Playlist | null>(null);
  playlistPeeks = signal<PlaylistPeek[]>([]);
  currentPeek = signal<PlaylistPeek | null>(null);

  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playlistService: PlaylistService,
  ) {}

  ngOnInit() {
    const playlistId = Number(this.route.snapshot.paramMap.get('playlistId'));

    if (!playlistId) {
      this.errorMessage.set('Playlist tidak ditemukan.');
      return;
    }

    this.playlistService.getPlaylist(playlistId).subscribe({
      next: (data) => {
        this.playlist.set(data);
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil playlist.');
      },
    });

    this.playlistService.getPlaylistPeeks(playlistId).subscribe({
      next: (data) => {
        this.playlistPeeks.set(data);

        this.updateCurrentPeek();
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil Peek playlist.');
      },
    });

    this.route.paramMap.subscribe(() => {
      this.updateCurrentPeek();
    });
  }

  goBack() {
    const playlistId = this.route.snapshot.paramMap.get('playlistId');

    this.router.navigate(['/playlists', playlistId]);
  }

  previousPeek() {
    const current = this.currentPeek();

    if (!current) {
      return;
    }

    const peeks = this.playlistPeeks();

    const currentIndex = peeks.findIndex((peek) => peek.id === current.id);

    if (currentIndex > 0) {
      const previous = peeks[currentIndex - 1];

      this.router.navigate([
        '/playlists',
        this.route.snapshot.paramMap.get('playlistId'),
        'peek',
        previous.id,
      ]);
    }
  }

  nextPeek() {
    const current = this.currentPeek();

    if (!current) {
      return;
    }

    const peeks = this.playlistPeeks();

    const currentIndex = peeks.findIndex((peek) => peek.id === current.id);

    if (currentIndex < peeks.length - 1) {
      const next = peeks[currentIndex + 1];

      this.router.navigate([
        '/playlists',
        this.route.snapshot.paramMap.get('playlistId'),
        'peek',
        next.id,
      ]);
    }
  }

  getCurrentPosition(): number {
    const current = this.currentPeek();

    if (!current) {
      return 0;
    }

    return this.playlistPeeks().findIndex((peek) => peek.id === current.id) + 1;
  }

  isFirstPeek(): boolean {
    const current = this.currentPeek();

    if (!current) {
      return true;
    }

    return this.playlistPeeks()[0]?.id === current.id;
  }

  isLastPeek(): boolean {
    const current = this.currentPeek();

    if (!current) {
      return true;
    }

    const peeks = this.playlistPeeks();

    return peeks[peeks.length - 1]?.id === current.id;
  }

  updateCurrentPeek() {
    const peekId = Number(this.route.snapshot.paramMap.get('peekId'));

    const peek = this.playlistPeeks().find((item) => item.id === peekId);

    if (!peek) {
      this.errorMessage.set('Peek tidak ditemukan dalam playlist.');
      return;
    }

    this.errorMessage.set('');
    this.currentPeek.set(peek);
  }

  openPlaylistPeek(peekId: number) {
    const playlistId = this.route.snapshot.paramMap.get('id');

    if (!playlistId) {
      return;
    }

    this.router.navigate(['/playlists', playlistId, 'peek', peekId]);
  }
}
