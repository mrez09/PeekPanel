import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeekService } from '../../services/peek.service';

@Component({
  selector: 'app-create-peek',
  imports: [FormsModule],
  templateUrl: './create-peek.html',
})
export class CreatePeek implements OnChanges {
  @Output() peekCreated = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @Input() editingPeek: {
    id: number;
    title: string;
    content: string;
    category_id: number;
    category_name: string;
    created_at: string;
    updated_at: string;
  } | null = null;

  title = '';
  content = '';
  categoryId = 1;
  categories = signal<{ id: number; name: string }[]>([]);
  errorMessage = '';
  successMessage = '';

  constructor(private peekService: PeekService) {}

  ngOnInit() {
    this.peekService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
      },
      error: (error) => {
        console.error('Get categories error:', error);
        this.errorMessage = 'Gagal mengambil kategori.';
      },
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingPeek'] && this.editingPeek) {
      this.title = this.editingPeek.title;
      this.content = this.editingPeek.content;
      this.categoryId = this.editingPeek.category_id;
    }
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingPeek) {
      this.peekService
        .updatePeek(this.editingPeek.id, {
          title: this.title,
          content: this.content,
          category_id: this.categoryId,
        })
        .subscribe({
          next: () => {
            this.successMessage = 'Peek berhasil diperbarui.';
            this.peekCreated.emit();
          },
          error: (error) => {
            this.errorMessage = error.error?.message ?? 'Gagal memperbarui Peek.';
          },
        });

      return;
    }

    this.peekService
      .createPeek({
        title: this.title,
        content: this.content,
        category_id: this.categoryId,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Peek berhasil dibuat.';

          this.title = '';
          this.content = '';
          this.categoryId = 1;

          this.peekCreated.emit();
        },
        error: (error) => {
          this.errorMessage = error.error?.message ?? 'Gagal membuat Peek.';
        },
      });
  }
}
