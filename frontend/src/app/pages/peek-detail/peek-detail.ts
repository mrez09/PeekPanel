import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PeekService } from '../../services/peek.service';
import { CreatePeek } from '../peeks/create-peek';

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
  selector: 'app-peek-detail',
  imports: [DatePipe, CreatePeek],
  templateUrl: './peek-detail.html',
  styleUrl: './peek-detail.css',
})
export class PeekDetail implements OnInit {
  peek = signal<Peek | null>(null);
  errorMessage = signal('');
  showEditForm = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private peekService: PeekService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Peek tidak ditemukan.');
      return;
    }

    this.peekService.getPeek(id).subscribe({
      next: (data) => {
        this.peek.set(data);
      },
      error: () => {
        this.errorMessage.set('Gagal mengambil detail Peek.');
      },
    });
  }

  goBack() {
    this.router.navigate(['/peeks']);
  }

  editPeek() {
    this.showEditForm.set(true);
  }

  deletePeek() {
    const currentPeek = this.peek();

    if (!currentPeek) {
      return;
    }

    const confirmed = confirm(`Yakin ingin menghapus "${currentPeek.title}"?`);

    if (!confirmed) {
      return;
    }

    this.peekService.deletePeek(currentPeek.id).subscribe({
      next: () => {
        this.router.navigate(['/peeks']);
      },
      error: () => {
        this.errorMessage.set('Gagal menghapus Peek.');
      },
    });
  }
}
