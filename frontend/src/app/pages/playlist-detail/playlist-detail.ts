import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Playlist, PlaylistPeek, PlaylistService } from '../../services/playlist.service';
import { PeekService } from '../../services/peek.service';
import { OverlayService } from '../../services/overlay.service';

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';

import go from 'highlight.js/lib/languages/go';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';

interface Peek {
  id: number;
  title: string;
  content: string;
  category_id: number;
  category_name: string;
  created_at: string;
  updated_at: string;
}

hljs.registerLanguage('go', go);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('typescript', typescript);

@Component({
  selector: 'app-playlist-detail',
  imports: [DatePipe],
  templateUrl: './playlist-detail.html',
  styleUrl: './playlist-detail.css',
})
export class PlaylistDetail implements OnInit {
  playlist = signal<Playlist | null>(null);
  playlistPeeks = signal<PlaylistPeek[]>([]);
  errorMessage = signal('');

  availablePeeks = signal<Peek[]>([]);
  selectedPeekIds = signal<number[]>([]);
  showAddPeek = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playlistService: PlaylistService,
    private peekService: PeekService,
    private overlayService: OverlayService,
  ) {}

  renderMarkdown(content: string): string {
    const renderer = new marked.Renderer();

    renderer.code = ({ text, lang }) => {
      const language = lang && hljs.getLanguage(lang) ? lang : '';

      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;

      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    };

    const html = marked.parse(content || '', {
      renderer,
      async: false,
    });

    return DOMPurify.sanitize(html);
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Playlist tidak ditemukan.');
      return;
    }

    this.loadPlaylistPeeks(id);

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

  openPlaylistPeek(peekId: number) {
    const playlistId = this.route.snapshot.paramMap.get('id');

    if (!playlistId) {
      return;
    }

    this.router.navigate(['/playlists', playlistId, 'peek', peekId]);
  }

  openPeekPopup(peekId: number) {
    const playlistId = this.route.snapshot.paramMap.get('id');

    if (!playlistId) {
      return;
    }

    this.overlayService.openOverlay(Number(playlistId), peekId);
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

  isPeekInPlaylist(peekId: number): boolean {
    return this.playlistPeeks().some((peek) => peek.id === peekId);
  }

  togglePeek(peekId: number) {
    if (this.isPeekInPlaylist(peekId)) {
      return;
    }

    this.selectedPeekIds.update((ids) => {
      if (ids.includes(peekId)) {
        return ids.filter((id) => id !== peekId);
      }

      return [...ids, peekId];
    });
  }

  addSelectedPeeks() {
    const playlist = this.playlist();

    if (!playlist) {
      return;
    }

    const selectedIds = this.selectedPeekIds();

    if (selectedIds.length === 0) {
      this.errorMessage.set('Pilih minimal satu Peek.');
      return;
    }

    let completed = 0;

    selectedIds.forEach((peekId, index) => {
      this.playlistService
        .addPeekToPlaylist(playlist.id, peekId, this.playlistPeeks().length + index)
        .subscribe({
          next: () => {
            completed++;

            if (completed === selectedIds.length) {
              this.showAddPeek.set(false);
              this.selectedPeekIds.set([]);
              this.loadPlaylistPeeks(playlist.id);
            }
          },
          error: () => {
            this.errorMessage.set('Gagal menambahkan Peek ke playlist.');
          },
        });
    });
  }

  loadPlaylistPeeks(playlistId: number) {
    this.playlistService.getPlaylistPeeks(playlistId).subscribe({
      next: (data) => {
        this.playlistPeeks.set(data);
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil Peek dalam playlist.');
      },
    });
  }

  removePeek(peekId: number) {
    const playlist = this.playlist();

    if (!playlist) {
      return;
    }

    const confirmed = confirm('Yakin ingin menghapus Peek dari playlist?');

    if (!confirmed) {
      return;
    }

    this.playlistService.removePeekFromPlaylist(playlist.id, peekId).subscribe({
      next: () => {
        this.loadPlaylistPeeks(playlist.id);
      },
      error: () => {
        this.errorMessage.set('Gagal menghapus Peek dari playlist.');
      },
    });
  }
}
