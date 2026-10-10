import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PeekService } from '../../services/peek.service';
import { CreatePeek } from './create-peek';

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

  toggleCreateForm() {
    this.editingPeek.set(null);
    this.showCreateForm.update((value) => !value);
  }

  editPeek(peek: Peek) {
    this.editingPeek.set(peek);
    this.showCreateForm.set(true);
  }

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

  viewPeek(peek: Peek) {
    this.router.navigate(['/peeks', peek.id]);
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
