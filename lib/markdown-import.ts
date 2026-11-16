import type { NoteContent, NoteNode } from '@/types/database.types';

/**
 * Tiny Markdown -> TipTap JSON converter used by the "import .md" flow.
 * Supports headings, paragraphs, bullet/ordered/task lists, quotes, fenced
 * code, horizontal rules, images and inline bold/italic/code/strike/link.
 */

function parseInline(text: string): NoteNode[] {
  const nodes: NoteNode[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) {
      nodes.push({ type: 'text', text: buffer });
      buffer = '';
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      flush();
      nodes.push({ type: 'text', text: link[1] ?? '', marks: [{ type: 'link', attrs: { href: link[2] } }] });
      i += link[0].length;
      continue;
    }

    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      flush();
      nodes.push({ type: 'text', text: code[1] ?? '', marks: [{ type: 'code' }] });
      i += code[0].length;
      continue;
    }

    const strong = /^(\*\*|__)(.+?)\1/.exec(rest);
    if (strong) {
      flush();
      nodes.push({ type: 'text', text: strong[2] ?? '', marks: [{ type: 'bold' }] });
      i += strong[0].length;
      continue;
    }

    const strike = /^~~(.+?)~~/.exec(rest);
    if (strike) {
      flush();
      nodes.push({ type: 'text', text: strike[1] ?? '', marks: [{ type: 'strike' }] });
      i += strike[0].length;
      continue;
    }

    const em = /^(\*|_)(.+?)\1/.exec(rest);
    if (em) {
      flush();
      nodes.push({ type: 'text', text: em[2] ?? '', marks: [{ type: 'italic' }] });
      i += em[0].length;
      continue;
    }

    buffer += text[i];
    i += 1;
  }

  flush();
  return nodes.length > 0 ? nodes : [{ type: 'text', text: text }];
}

export function markdownToDoc(markdown: string): NoteContent {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const content: NoteNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i] ?? '')) {
        codeLines.push(lines[i] ?? '');
        i += 1;
      }
      i += 1;
      content.push({
        type: 'codeBlock',
        attrs: { language: fence[1] || null },
        content: codeLines.length ? [{ type: 'text', text: codeLines.join('\n') }] : undefined,
      });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: Math.min((heading[1] ?? '#').length, 3) },
        content: parseInline(heading[2] ?? ''),
      });
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      content.push({ type: 'horizontalRule' });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i += 1;
      }
      content.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: parseInline(quoteLines.join(' ')) }],
      });
      continue;
    }

    if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) {
      const items: NoteNode[] = [];
      while (i < lines.length) {
        const match = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(lines[i] ?? '');
        if (!match) break;
        items.push({
          type: 'taskItem',
          attrs: { checked: match[1]?.toLowerCase() === 'x' },
          content: [{ type: 'paragraph', content: parseInline(match[2] ?? '') }],
        });
        i += 1;
      }
      content.push({ type: 'taskList', content: items });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: NoteNode[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i] ?? '') && !/^\s*[-*+]\s+\[[ xX]\]\s+/.test(lines[i] ?? '')) {
        const itemText = (lines[i] ?? '').replace(/^\s*[-*+]\s+/, '');
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(itemText) }] });
        i += 1;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: NoteNode[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i] ?? '')) {
        const itemText = (lines[i] ?? '').replace(/^\s*\d+[.)]\s+/, '');
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(itemText) }] });
        i += 1;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line.trim());
    if (image) {
      content.push({ type: 'image', attrs: { src: image[2], alt: image[1] ?? null } });
      i += 1;
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() && !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i] ?? '')) {
      paragraphLines.push(lines[i] ?? '');
      i += 1;
    }
    content.push({ type: 'paragraph', content: parseInline(paragraphLines.join(' ')) });
  }

  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

/** Splits an imported markdown file into a title (first H1) and the body. */
export function splitMarkdownTitle(markdown: string, fallback: string): { title: string; body: string } {
  const match = /^#\s+(.+)$/m.exec(markdown);
  if (!match) return { title: fallback, body: markdown };
  return {
    title: (match[1] ?? fallback).trim(),
    body: markdown.replace(match[0], '').trimStart(),
  };
}
