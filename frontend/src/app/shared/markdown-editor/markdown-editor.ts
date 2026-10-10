import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

import { createLowlight } from 'lowlight';

import go from 'highlight.js/lib/languages/go';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';

const lowlight = createLowlight({
  go,
  sql,
  xml,
  javascript,
  css,
  json,
  typescript,
});

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  templateUrl: './markdown-editor.html',
  styleUrl: './markdown-editor.css',
})
export class MarkdownEditor implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editorHost') editorHost!: ElementRef<HTMLDivElement>;
  @ViewChild('sourceHost') sourceHost!: ElementRef<HTMLDivElement>;

  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  editor: Editor | null = null;
  sourceView: EditorView | null = null;
  editorMode: 'visual' | 'markdown' | 'preview' = 'visual';
  previewHtml = '';

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.editorHost.nativeElement,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
        Markdown,
      ],
      content: this.value || '',
      contentType: 'markdown',
      editorProps: {
        attributes: {
          class: 'min-h-72 bg-zinc-950 p-4 text-sm text-zinc-100 outline-none',
          spellcheck: 'true',
        },
      },
      onUpdate: ({ editor }) => {
        const markdown = editor.getMarkdown();
        this.valueChange.emit(markdown);
        this.updatePreview(markdown);
      },
    });

    this.sourceView = new EditorView({
      parent: this.sourceHost.nativeElement,
      state: EditorState.create({
        doc: this.value || '',
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          markdownLanguage(),
          syntaxHighlighting(defaultHighlightStyle),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const markdown = update.state.doc.toString();
              this.valueChange.emit(markdown);
              this.updatePreview(markdown);
            }
          }),
        ],
      }),
    });

    this.updatePreview(this.value || '');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['value'] || changes['value'].firstChange) return;

    const markdown = this.value || '';

    if (this.editor && this.editor.getMarkdown() !== markdown) {
      this.editor.commands.setContent(markdown, {
        contentType: 'markdown',
      });
    }

    if (this.sourceView && this.sourceView.state.doc.toString() !== markdown) {
      this.sourceView.dispatch({
        changes: {
          from: 0,
          to: this.sourceView.state.doc.length,
          insert: markdown,
        },
      });
    }

    this.updatePreview(markdown);
  }

  setMode(mode: 'visual' | 'markdown' | 'preview'): void {
    if (!this.editor || !this.sourceView) return;

    if (mode === 'markdown') {
      const markdown = this.editor.getMarkdown();

      if (this.sourceView.state.doc.toString() !== markdown) {
        this.sourceView.dispatch({
          changes: {
            from: 0,
            to: this.sourceView.state.doc.length,
            insert: markdown,
          },
        });
      }
    }

    if (mode === 'visual') {
      const markdown = this.sourceView.state.doc.toString();

      if (this.editor.getMarkdown() !== markdown) {
        this.editor.commands.setContent(markdown, {
          contentType: 'markdown',
        });
      }

      this.updatePreview(markdown);
    }

    if (mode === 'preview') {
      const markdown =
        this.editorMode === 'markdown'
          ? this.sourceView.state.doc.toString()
          : this.editor.getMarkdown();

      this.updatePreview(markdown);
    }

    this.editorMode = mode;
  }

  private updatePreview(markdown: string): void {
    const html = marked.parse(markdown, { async: false });
    this.previewHtml = DOMPurify.sanitize(html);
  }

  insertFormatting(before: string, after = before): void {
    if (!this.editor) return;

    switch (before) {
      case '**':
        this.editor.chain().focus().toggleBold().run();
        break;
      case '*':
        this.editor.chain().focus().toggleItalic().run();
        break;
      case '`':
        this.editor.chain().focus().toggleCode().run();
        break;
      default:
        this.editor.chain().focus().toggleCodeBlock().run();
        break;
    }
  }

  setCodeLanguage(language: string): void {
    if (!this.editor) return;

    const { $from } = this.editor.state.selection;

    // Ubah bahasa hanya pada code block yang sedang aktif.
    if ($from.parent.type.name !== 'codeBlock') {
      return;
    }

    this.editor
      .chain()
      .focus()
      .updateAttributes('codeBlock', {
        language: language || null,
      })
      .run();
  }

  insertCodeBlock(): void {
    if (!this.editor) return;

    const editor = this.editor;
    const { from, to, empty } = editor.state.selection;

    // Jika tidak ada teks yang dipilih, buat code block biasa.
    if (empty) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    // Satukan teks dari paragraf yang dipilih menjadi satu blok.
    const selectedText = editor.state.doc.textBetween(from, to, '\n');

    const codeBlockType = editor.schema.nodes['codeBlock'];

    if (!codeBlockType) return;

    const codeBlock = codeBlockType.create(
      { language: null },
      selectedText ? editor.schema.text(selectedText) : null,
    );

    const transaction = editor.state.tr.replaceRangeWith(from, to, codeBlock);

    editor.view.dispatch(transaction);
    editor.commands.focus();
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.sourceView?.destroy();
    this.editor = null;
    this.sourceView = null;
  }
}
