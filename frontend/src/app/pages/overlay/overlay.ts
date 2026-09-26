import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PeekService } from '../../services/peek.service';
import { PlaylistPeek, PlaylistService } from '../../services/playlist.service';

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
  selector: 'app-overlay',
  imports: [],
  templateUrl: './overlay.html',
  styleUrl: './overlay.css',
})
export class Overlay implements OnInit {
  peeks = signal<Peek[]>([]);
  searchQuery = signal('');
  errorMessage = signal('');
  selectedPeek = signal<Peek | null>(null);

  playlistId = signal<number | null>(null);
  playlistPeeks = signal<PlaylistPeek[]>([]);
  currentPlaylistPeek = signal<PlaylistPeek | null>(null);

  constructor(
    private peekService: PeekService,
    private playlistService: PlaylistService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const playlistId = Number(params.get('playlistId'));
      const peekId = Number(params.get('peekId'));

      if (playlistId && peekId) {
        this.playlistId.set(playlistId);
        this.loadPlaylistPeeks(playlistId, peekId);
        return;
      }

      this.loadPeeks();
    });
  }

  loadPeeks() {
    this.peekService.getPeeks().subscribe({
      next: (data) => {
        this.peeks.set(data);
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil data Peek.');
      },
    });
  }

  filteredPeeks() {
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      return this.peeks();
    }

    return this.peeks().filter(
      (peek) =>
        peek.title.toLowerCase().includes(query) ||
        peek.category_name.toLowerCase().includes(query) ||
        peek.content.toLowerCase().includes(query),
    );
  }

  openPeek(peek: Peek) {
    this.selectedPeek.set(peek);
  }

  closeOverlay() {
    window.close();
  }

  loadPlaylistPeeks(playlistId: number, peekId: number) {
    this.playlistService.getPlaylistPeeks(playlistId).subscribe({
      next: (data) => {
        this.playlistPeeks.set(data);

        const current = data.find((peek) => peek.id === peekId);

        if (current) {
          this.currentPlaylistPeek.set(current);
        } else {
          this.errorMessage.set('Peek tidak ditemukan dalam playlist.');
        }
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil Peek dari playlist.');
      },
    });
  }

  previousPlaylistPeek() {
    const current = this.currentPlaylistPeek();

    if (!current) {
      return;
    }

    const peeks = this.playlistPeeks();
    const currentIndex = peeks.findIndex((peek) => peek.id === current.id);

    if (currentIndex <= 0) {
      return;
    }

    const previous = peeks[currentIndex - 1];

    this.currentPlaylistPeek.set(previous);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        playlistId: this.playlistId(),
        peekId: previous.id,
      },
      replaceUrl: true,
    });
  }

  nextPlaylistPeek() {
    const current = this.currentPlaylistPeek();

    if (!current) {
      return;
    }

    const peeks = this.playlistPeeks();
    const currentIndex = peeks.findIndex((peek) => peek.id === current.id);

    if (currentIndex === -1 || currentIndex >= peeks.length - 1) {
      return;
    }

    const next = peeks[currentIndex + 1];

    this.currentPlaylistPeek.set(next);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        playlistId: this.playlistId(),
        peekId: next.id,
      },
      replaceUrl: true,
    });
  }

  isFirstPlaylistPeek() {
    const current = this.currentPlaylistPeek();

    if (!current) {
      return true;
    }

    return this.playlistPeeks().findIndex((peek) => peek.id === current.id) === 0;
  }

  isLastPlaylistPeek() {
    const current = this.currentPlaylistPeek();
    const peeks = this.playlistPeeks();

    if (!current || peeks.length === 0) {
      return true;
    }

    return peeks.findIndex((peek) => peek.id === current.id) === peeks.length - 1;
  }

  getPlaylistPeekPosition() {
    const current = this.currentPlaylistPeek();

    if (!current) {
      return 0;
    }

    const index = this.playlistPeeks().findIndex((peek) => peek.id === current.id);

    return index + 1;
  }
}
