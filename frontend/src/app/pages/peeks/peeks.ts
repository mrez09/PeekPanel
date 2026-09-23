import { Component, OnInit, signal } from '@angular/core';
import { PeekService } from '../../services/peek.service';
import { CreatePeek } from './create-peek';

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
  selector: 'app-peeks',
  imports: [CreatePeek],
  templateUrl: './peeks.html',
  styleUrl: './peeks.css',
})
export class Peeks implements OnInit {
  showCreateForm = signal(false);
  editingPeek = signal<Peek | null>(null);

  peeks = signal<Peek[]>([]);
  errorMessage = signal('');

  constructor(private peekService: PeekService) {}

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

  toggleCreateForm() {
    this.editingPeek.set(null);
    this.showCreateForm.update((value) => !value);
  }

  editPeek(peek: Peek) {
    this.editingPeek.set(peek);
    this.showCreateForm.set(true);
  }

  deletePeek(peek: Peek) {
    const confirmed = confirm(`Yakin ingin menghapus "${peek.title}"?`);

    if (!confirmed) {
      return;
    }

    this.peekService.deletePeek(peek.id).subscribe({
      next: () => {
        this.loadPeeks();
      },
      error: () => {
        this.errorMessage.set('Gagal menghapus Peek.');
      },
    });
  }

  onPeekSaved() {
    this.loadPeeks();
    this.showCreateForm.set(false);
    this.editingPeek.set(null);
  }
}
