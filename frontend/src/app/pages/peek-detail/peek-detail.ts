import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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

import { PeekService } from '../../services/peek.service';
import { CreatePeek } from '../peeks/create-peek';

hljs.registerLanguage('go', go);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('typescript', typescript);

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
