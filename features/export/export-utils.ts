'use client';

import type { NoteContent } from '@/types/database.types';
import { docToHtml, docToMarkdown } from '@/lib/editor/content';
import { sanitizeHtml } from '@/lib/editor/sanitize';
import { printHref, withBasePath } from '@/lib/paths';

export function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(title: string, fallback = 'note'): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
  return cleaned || fallback;
}

export function exportMarkdown(title: string, content: NoteContent) {
  downloadBlob(
    docToMarkdown(content, title),
    `${safeFileName(title)}.md`,
    'text/markdown;charset=utf-8',
  );
}

/** Standalone, print-ready HTML with RTL styles and no external assets. */
export function buildStandaloneHtml(
  title: string,
  content: NoteContent,
  meta?: { author?: string; date?: string },
) {
  const body = sanitizeHtml(docToHtml(content));
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: Vazirmatn, "Segoe UI", Tahoma, sans-serif; max-width: 46rem; margin: 3rem auto; padding: 0 1.25rem; line-height: 1.9; color: #16181d; }
  h1,h2,h3 { line-height: 1.4; margin: 1.6em 0 .6em; }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.4rem; }
  h3 { font-size: 1.15rem; }
  pre { background: #f4f4f6; padding: 1rem; border-radius: .5rem; overflow-x: auto; direction: ltr; text-align: left; }
  code { font-family: ui-monospace, monospace; }
  blockquote { border-inline-start: 3px solid #c9c9d4; margin: 1em 0; padding-inline-start: 1rem; color: #555; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: .4rem .6rem; }
  img { max-width: 100%; border-radius: .5rem; }
  .wiki-link { color: #5b4bdb; text-decoration: underline; text-decoration-style: dotted; }
  .task-item { list-style: none; }
  .meta { color: #6b7280; font-size: .8rem; margin-bottom: 2rem; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<header>
  <h1>${escape(title || 'بدون عنوان')}</h1>
  ${meta?.date || meta?.author ? `<p class="meta">${escape(meta?.author ?? '')}${meta?.date ? ` · ${escape(meta.date)}` : ''}</p>` : ''}
</header>
<main>${body}</main>
</body>
</html>`;
}

export function exportHtml(title: string, content: NoteContent) {
  downloadBlob(
    buildStandaloneHtml(title, content),
    `${safeFileName(title)}.html`,
    'text/html;charset=utf-8',
  );
}

export function exportPdf(title: string, noteId: string) {
  const printWindow = window.open(
    withBasePath(printHref(noteId, true)),
    '_blank',
    'noopener,width=900,height=1200',
  );
  if (!printWindow) {
    window.location.href = withBasePath(printHref(noteId));
    return;
  }
  printWindow.focus();
}

export function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );
}
