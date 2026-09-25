import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    private peekService: PeekService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadPeeks();
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
}
