import { describe, expect, it } from 'vitest';
import { markdownToDoc, splitMarkdownTitle } from '@/lib/markdown-import';
import { docToText } from '@/lib/editor/content';

describe('markdownToDoc', () => {
  it('parses headings and paragraphs', () => {
    const doc = markdownToDoc('# عنوان\n\nمتن ساده');
    expect(doc.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    expect(doc.content?.[1]).toMatchObject({ type: 'paragraph' });
  });

  it('parses task lists', () => {
    const doc = markdownToDoc('- [x] انجام شد\n- [ ] باقی‌مانده');
    const list = doc.content?.[0];
    expect(list?.type).toBe('taskList');
    expect(list?.content?.[0]?.attrs?.checked).toBe(true);
    expect(list?.content?.[1]?.attrs?.checked).toBe(false);
  });

  it('parses bullet and ordered lists', () => {
    const doc = markdownToDoc('- یک\n- دو');
    expect(doc.content?.[0]?.type).toBe('bulletList');
    expect(doc.content?.[0]?.content).toHaveLength(2);

    const ordered = markdownToDoc('1. اول\n2. دوم');
    expect(ordered.content?.[0]?.type).toBe('orderedList');
  });

  it('handles fenced code blocks', () => {
    const doc = markdownToDoc('```js\nconsole.log(1)\n```');
    expect(doc.content?.[0]).toMatchObject({ type: 'codeBlock', attrs: { language: 'js' } });
  });

  it('handles quotes, rules and images', () => {
    expect(markdownToDoc('> نقل قول').content?.[0]?.type).toBe('blockquote');
    expect(markdownToDoc('---').content?.[0]?.type).toBe('horizontalRule');
    expect(markdownToDoc('![alt](https://x.test/a.png)').content?.[0]?.type).toBe('image');
  });

  it('parses inline formatting', () => {
    const doc = markdownToDoc('**ضخیم** و *کج* و `کد` و [لینک](https://example.com)');
    const marks = (doc.content?.[0]?.content ?? []).flatMap((node) =>
      (node.marks ?? []).map((mark) => mark.type),
    );
    expect(marks).toEqual(expect.arrayContaining(['bold', 'italic', 'code', 'link']));
  });

  it('returns an empty paragraph for empty input', () => {
    expect(docToText(markdownToDoc(''))).toBe('');
    expect(markdownToDoc('').content).toHaveLength(1);
  });
});

describe('splitMarkdownTitle', () => {
  it('extracts the first h1 as the title', () => {
    expect(splitMarkdownTitle('# سلام\n\nمتن', 'file')).toEqual({ title: 'سلام', body: 'متن' });
  });

  it('falls back to the file name', () => {
    expect(splitMarkdownTitle('متن', 'file')).toEqual({ title: 'file', body: 'متن' });
  });
});
