import { describe, expect, it } from 'vitest';
import {
  countWords,
  deriveTitle,
  docToHtml,
  docToMarkdown,
  docToText,
  emptyDoc,
  isEmptyDoc,
  readingTimeMinutes,
} from '@/lib/editor/content';
import { sanitizeHtml } from '@/lib/editor/sanitize';
import type { NoteContent } from '@/types/database.types';

const richDoc: NoteContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'عنوان' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'متن ' },
        { type: 'text', text: 'پررنگ', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' و ' },
        {
          type: 'text',
          text: 'لینک',
          marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'کار انجام شد' }] }],
        },
      ],
    },
    { type: 'codeBlock', content: [{ type: 'text', text: 'const x = 1;' }] },
  ],
};

describe('docToText', () => {
  it('flattens blocks into lines', () => {
    expect(docToText(richDoc)).toBe('عنوان\nمتن پررنگ و لینک\nکار انجام شد\nconst x = 1;');
  });

  it('returns an empty string for an empty doc', () => {
    expect(docToText(emptyDoc())).toBe('');
  });
});

describe('countWords / readingTime', () => {
  it('counts whitespace separated words', () => {
    expect(countWords('یک دو سه')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });

  it('never returns zero minutes for non-empty text', () => {
    expect(readingTimeMinutes(1)).toBe(1);
    expect(readingTimeMinutes(0)).toBe(0);
    expect(readingTimeMinutes(1000, 'en')).toBeLessThanOrEqual(5);
  });
});

describe('isEmptyDoc / deriveTitle', () => {
  it('detects empty docs', () => {
    expect(isEmptyDoc(emptyDoc())).toBe(true);
    expect(isEmptyDoc(richDoc)).toBe(false);
  });

  it('derives a title from the first line', () => {
    expect(deriveTitle(richDoc)).toBe('عنوان');
    expect(deriveTitle(emptyDoc())).toBe('');
  });
});

describe('docToHtml', () => {
  it('renders headings, marks and links', () => {
    const html = docToHtml(richDoc);
    expect(html).toContain('<h1>عنوان</h1>');
    expect(html).toContain('<strong>پررنگ</strong>');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('escapes raw HTML in text nodes', () => {
    const html = docToHtml({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] },
      ],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops javascript: image sources', () => {
    const html = docToHtml({
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'x' } }],
    });
    expect(html).toBe('');
  });

  it('marks wiki links for styling', () => {
    const html = docToHtml({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '[[هدف]]' }] }],
    });
    expect(html).toContain('class="wiki-link"');
  });

  it('renders task items with checked state', () => {
    expect(docToHtml(richDoc)).toContain('data-checked="true"');
  });
});

describe('sanitizeHtml', () => {
  it('strips scripts, event handlers and styles', () => {
    const clean = sanitizeHtml(
      '<p onclick="alert(1)">hi</p><script>bad()</script><style>p{}</style>',
    );
    expect(clean).toContain('<p>hi</p>');
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('style');
  });

  it('blocks javascript: urls', () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(clean).not.toContain('javascript:');
  });

  it('keeps safe https links', () => {
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).toContain('https://example.com');
  });
});

describe('docToMarkdown', () => {
  it('serialises marks and blocks', () => {
    const markdown = docToMarkdown(richDoc, 'عنوان');
    expect(markdown.startsWith('# عنوان')).toBe(true);
    expect(markdown).toContain('**پررنگ**');
    expect(markdown).toContain('[لینک](https://example.com)');
    expect(markdown).toContain('- [x] کار انجام شد');
    expect(markdown).toContain('```');
  });
});
