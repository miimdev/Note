import { describe, expect, it } from 'vitest';
import {
  buildTitleIndex,
  filterTitleSuggestions,
  parseWikiLinks,
  replaceLinkTitle,
  resolveLinks,
} from '@/lib/links';
import { extractWikiLinks } from '@/lib/editor/content';
import type { NoteContent } from '@/types/database.types';

const doc = (text: string): NoteContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe('parseWikiLinks', () => {
  it('extracts unique links', () => {
    const links = parseWikiLinks(
      doc('ببین [[یادداشت الف]] و دوباره [[یادداشت الف]] و [[یادداشت ب]]'),
    );
    expect(links.map((link) => link.title)).toEqual(['یادداشت الف', 'یادداشت ب']);
  });

  it('normalises titles for de-duplication', () => {
    const links = parseWikiLinks(doc('[[علي]] و [[علی]]'));
    expect(links).toHaveLength(1);
    expect(links[0]?.normalized).toBe('علی');
  });

  it('ignores unclosed links', () => {
    expect(parseWikiLinks(doc('[[باز نشده و خالی'))).toHaveLength(0);
    expect(parseWikiLinks(doc(']] بدون شروع'))).toHaveLength(0);
  });

  it('works across nested blocks', () => {
    const nested: NoteContent = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '[[عنوان]]' }] },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '[[کار]]' }] }],
            },
          ],
        },
      ],
    };
    expect(extractWikiLinks(nested)).toEqual(['عنوان', 'کار']);
  });
});

describe('buildTitleIndex + resolveLinks', () => {
  it('resolves links to ids and keeps dangling ones', () => {
    const index = buildTitleIndex([
      { id: '1', title: 'یادداشت الف' },
      { id: '2', title: 'یادداشت ب' },
    ]);
    const resolved = resolveLinks(parseWikiLinks(doc('[[یادداشت الف]] و [[ناموجود]]')), index);
    expect(resolved).toEqual([
      { title: 'یادداشت الف', targetId: '1' },
      { title: 'ناموجود', targetId: null },
    ]);
  });

  it('is case and variant insensitive', () => {
    const index = buildTitleIndex([{ id: '1', title: 'Project Plan' }]);
    expect(index.get('project plan')).toBe('1');
  });
});

describe('filterTitleSuggestions', () => {
  const notes = [
    { id: '1', title: 'برنامه پروژه' },
    { id: '2', title: 'پروژه جدید' },
    { id: '3', title: 'جلسه تیم' },
  ];

  it('ranks prefix matches first', () => {
    const result = filterTitleSuggestions(notes, 'پروژه');
    expect(result[0]?.id).toBe('2');
  });

  it('returns the first notes for an empty query', () => {
    expect(filterTitleSuggestions(notes, '', 2)).toHaveLength(2);
  });

  it('filters unrelated notes out', () => {
    expect(filterTitleSuggestions(notes, 'zzz')).toHaveLength(0);
  });
});

describe('replaceLinkTitle', () => {
  it('rewrites the link text without mutating the source', () => {
    const source = doc('[[قدیمی]]');
    const updated = replaceLinkTitle(source, 'قدیمی', 'جدید');
    expect(extractWikiLinks(updated)).toEqual(['جدید']);
    expect(extractWikiLinks(source)).toEqual(['قدیمی']);
  });
});
