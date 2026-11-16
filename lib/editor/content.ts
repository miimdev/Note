import type { NoteContent, NoteNode } from '@/types/database.types';

export const EMPTY_DOC: NoteContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function emptyDoc(): NoteContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

const SKIP_TYPES = new Set(['mention', 'hashtag']);

/** Flattens a TipTap doc to plain text (one line per block). */
export function docToText(doc: NoteContent | null | undefined): string {
  if (!doc?.content) return '';

  const walk = (node: NoteNode): string => {
    if (node.type === 'text') return node.text ?? '';
    if (SKIP_TYPES.has(node.type)) return '';
    if (!node.content?.length) return '';
    return node.content.map(walk).join(' ');
  };

  return doc.content
    .map((node) => walk(node).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/u).filter(Boolean).length;
}

export function countCharacters(text: string): number {
  return text.replace(/\s+/g, '').length;
}

export function readingTimeMinutes(words: number, locale: 'fa' | 'en' = 'fa'): number {
  const wpm = locale === 'fa' ? 200 : 240;
  return words === 0 ? 0 : Math.max(1, Math.round(words / wpm));
}

/** Extracts `[[note title]]` references from a doc. */
export function extractWikiLinks(doc: NoteContent | null | undefined): string[] {
  const text = docToText(doc);
  const matches = text.matchAll(/\[\[([^\]\n]{1,200})\]\]/g);
  const seen = new Set<string>();
  for (const match of matches) {
    const title = (match[1] ?? '').trim();
    if (title) seen.add(title);
  }
  return [...seen];
}

const INLINE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => INLINE_ESCAPES[ch] ?? ch);
}

/**
 * Renders a TipTap doc to safe HTML without pulling the editor into the bundle.
 * Handles the block types this app can produce; anything unknown is rendered as
 * a paragraph. Text is always escaped, so the output is XSS-safe by construction.
 */
export function docToHtml(doc: NoteContent | null | undefined): string {
  if (!doc?.content?.length) return '';

  const renderInline = (node: NoteNode): string => {
    if (node.type === 'text') {
      let html = escapeHtml(node.text ?? '').replace(
        /\[\[([^\]\n]{1,200})\]\]/g,
        (_m, title: string) => `<span class="wiki-link">${escapeHtml(title)}</span>`,
      );
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') html = `<strong>${html}</strong>`;
        else if (mark.type === 'italic') html = `<em>${html}</em>`;
        else if (mark.type === 'underline') html = `<u>${html}</u>`;
        else if (mark.type === 'strike') html = `<s>${html}</s>`;
        else if (mark.type === 'code') html = `<code>${html}</code>`;
        else if (mark.type === 'highlight') html = `<mark>${html}</mark>`;
        else if (mark.type === 'link') {
          const href = String(mark.attrs?.href ?? '');
          if (/^https?:\/\//i.test(href) || href.startsWith('/')) {
            html = `<a href="${escapeHtml(href)}" rel="noopener noreferrer nofollow" target="_blank">${html}</a>`;
          }
        }
      }
      return html;
    }
    if (node.type === 'hardBreak') return '<br />';
    return (node.content ?? []).map(renderInline).join('');
  };

  const renderNode = (node: NoteNode): string => {
    switch (node.type) {
      case 'heading': {
        const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 3);
        return `<h${level}>${(node.content ?? []).map(renderInline).join('')}</h${level}>`;
      }
      case 'paragraph':
        return `<p>${(node.content ?? []).map(renderInline).join('')}</p>`;
      case 'bulletList':
        return `<ul>${(node.content ?? []).map(renderNode).join('')}</ul>`;
      case 'orderedList':
        return `<ol>${(node.content ?? []).map(renderNode).join('')}</ol>`;
      case 'listItem':
        return `<li>${(node.content ?? []).map(renderNode).join('')}</li>`;
      case 'taskList':
        return `<ul class="task-list">${(node.content ?? []).map(renderNode).join('')}</ul>`;
      case 'taskItem': {
        const checked = node.attrs?.checked === true;
        return `<li class="task-item" data-checked="${checked}"><input type="checkbox" disabled ${
          checked ? 'checked' : ''
        } /> ${(node.content ?? []).map(renderNode).join('')}</li>`;
      }
      case 'blockquote':
        return `<blockquote>${(node.content ?? []).map(renderNode).join('')}</blockquote>`;
      case 'codeBlock':
        return `<pre><code>${escapeHtml(
          (node.content ?? []).map((child) => child.text ?? '').join(''),
        )}</code></pre>`;
      case 'horizontalRule':
        return '<hr />';
      case 'image': {
        const src = String(node.attrs?.src ?? '');
        if (!/^(https?:\/\/|\/)/i.test(src)) return '';
        const alt = escapeHtml(String(node.attrs?.alt ?? ''));
        return `<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" /></figure>`;
      }
      case 'table':
        return `<table>${(node.content ?? []).map(renderNode).join('')}</table>`;
      case 'tableRow':
        return `<tr>${(node.content ?? []).map(renderNode).join('')}</tr>`;
      case 'tableHeader':
        return `<th>${(node.content ?? []).map(renderNode).join('')}</th>`;
      case 'tableCell':
        return `<td>${(node.content ?? []).map(renderNode).join('')}</td>`;
      default:
        if (node.content?.length) return `<p>${node.content.map(renderInline).join('')}</p>`;
        return '';
    }
  };

  return doc.content.map(renderNode).join('\n');
}

/** Minimal Markdown serialiser used by export / share. */
export function docToMarkdown(doc: NoteContent | null | undefined, title = ''): string {
  if (!doc?.content?.length) return title ? `# ${title}\n` : '';

  const renderInline = (node: NoteNode): string => {
    if (node.type === 'text') {
      let text = node.text ?? '';
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') text = `**${text}**`;
        else if (mark.type === 'italic') text = `*${text}*`;
        else if (mark.type === 'strike') text = `~~${text}~~`;
        else if (mark.type === 'code') text = `\`${text}\``;
        else if (mark.type === 'highlight') text = `==${text}==`;
        else if (mark.type === 'underline') text = `<u>${text}</u>`;
        else if (mark.type === 'link') {
          const href = String(mark.attrs?.href ?? '');
          if (href) text = `[${text}](${href})`;
        }
      }
      return text;
    }
    if (node.type === 'hardBreak') return '  \n';
    return (node.content ?? []).map(renderInline).join('');
  };

  const renderNode = (node: NoteNode, depth = 0): string => {
    const indent = '  '.repeat(depth);
    switch (node.type) {
      case 'heading':
        return `${'#'.repeat(Math.min(Number(node.attrs?.level ?? 1), 3))} ${(node.content ?? [])
          .map(renderInline)
          .join('')}`;
      case 'paragraph':
        return (node.content ?? []).map(renderInline).join('');
      case 'bulletList':
        return (node.content ?? []).map((child) => renderNode(child, depth)).join('\n');
      case 'orderedList':
        return (node.content ?? [])
          .map((child, index) => {
            const inner = (child.content ?? []).map((c) => renderNode(c, depth + 1)).join('\n');
            return `${indent}${index + 1}. ${inner.trimStart()}`;
          })
          .join('\n');
      case 'listItem': {
        const inner = (node.content ?? []).map((c) => renderNode(c, depth + 1)).join('\n');
        return `${indent}- ${inner.trimStart()}`;
      }
      case 'taskList':
        return (node.content ?? []).map((child) => renderNode(child, depth)).join('\n');
      case 'taskItem': {
        const checked = node.attrs?.checked === true;
        const inner = (node.content ?? []).map((c) => renderNode(c, depth + 1)).join(' ');
        return `${indent}- [${checked ? 'x' : ' '}] ${inner.trim()}`;
      }
      case 'blockquote':
        return (node.content ?? [])
          .map((child) => `> ${renderNode(child, depth)}`)
          .join('\n');
      case 'codeBlock': {
        const code = (node.content ?? []).map((child) => child.text ?? '').join('');
        return `\`\`\`\n${code}\n\`\`\``;
      }
      case 'horizontalRule':
        return '---';
      case 'image':
        return `![${String(node.attrs?.alt ?? '')}](${String(node.attrs?.src ?? '')})`;
      case 'table':
        return (node.content ?? []).map((child) => renderNode(child, depth)).join('\n');
      case 'tableRow':
        return `| ${(node.content ?? []).map((child) => renderNode(child, depth)).join(' | ')} |`;
      case 'tableHeader':
      case 'tableCell':
        return (node.content ?? []).map((c) => renderNode(c, depth)).join(' ');
      default:
        return (node.content ?? []).map((c) => renderNode(c, depth)).join('\n');
    }
  };

  const body = doc.content
    .map((node) => renderNode(node))
    .filter((block) => block.trim().length > 0)
    .join('\n\n');

  return title ? `# ${title}\n\n${body}\n` : `${body}\n`;
}

/** True when the document has no meaningful content. */
export function isEmptyDoc(doc: NoteContent | null | undefined): boolean {
  return docToText(doc).length === 0;
}

/** First meaningful line of the note, used as a title fallback. */
export function deriveTitle(doc: NoteContent | null | undefined, max = 80): string {
  const text = docToText(doc).split('\n').find((line) => line.trim().length > 0) ?? '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
