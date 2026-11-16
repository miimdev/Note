import { describe, expect, it } from 'vitest';
import { buildLocalGraph, buildLocalLinks } from '@/lib/graph';

const note = (
  overrides: Partial<Parameters<typeof buildLocalGraph>[0][number]> & { id: string },
) => ({
  title: overrides.id,
  content_text: '',
  is_favorite: false,
  is_archived: false,
  deleted_at: null,
  folder_id: null,
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('buildLocalGraph', () => {
  it('creates one node per visible note', () => {
    const { nodes } = buildLocalGraph([note({ id: 'a' }), note({ id: 'b' })]);
    expect(nodes.map((node) => node.id)).toEqual(['a', 'b']);
  });

  it('skips archived and trashed notes', () => {
    const { nodes } = buildLocalGraph([
      note({ id: 'a' }),
      note({ id: 'b', is_archived: true }),
      note({ id: 'c', deleted_at: '2024-02-01T00:00:00Z' }),
    ]);
    expect(nodes.map((node) => node.id)).toEqual(['a']);
  });

  it('links notes through [[wiki links]] in their text', () => {
    const { edges } = buildLocalGraph([
      note({ id: 'a', title: 'آلفا', content_text: 'ببین [[بتا]]' }),
      note({ id: 'b', title: 'بتا' }),
    ]);
    expect(edges).toEqual([{ source: 'a', target: 'b' }]);
  });

  it('resolves letter variants the way the database does', () => {
    const { edges } = buildLocalGraph([
      note({ id: 'a', title: 'علي', content_text: '[[علی]]' }),
      note({ id: 'b', title: 'علی' }),
    ]);
    expect(edges).toEqual([]);
    // 'a' is itself matched by the variant, so it is a self-link and dropped.
    const other = buildLocalGraph([
      note({ id: 'a', title: 'كتاب', content_text: '[[کتاب]]' }),
      note({ id: 'b', title: 'کتاب', content_text: '[[كتاب]]' }),
    ]);
    expect(other.edges).toEqual([{ source: 'b', target: 'a' }]);
  });

  it('drops dangling links', () => {
    const { edges } = buildLocalGraph([note({ id: 'a', content_text: '[[ناموجود]]' })]);
    expect(edges).toEqual([]);
  });

  it('de-duplicates repeated links', () => {
    const { edges } = buildLocalGraph([
      note({ id: 'a', title: 'آلفا', content_text: '[[بتا]] [[بتا]]' }),
      note({ id: 'b', title: 'بتا' }),
    ]);
    expect(edges).toHaveLength(1);
  });

  it('drops self links', () => {
    const { edges } = buildLocalGraph([note({ id: 'a', title: 'آلفا', content_text: '[[آلفا]]' })]);
    expect(edges).toEqual([]);
  });

  it('fills tag counts from the passed map', () => {
    const { nodes } = buildLocalGraph([note({ id: 'a' })], new Map([['a', 3]]));
    expect(nodes[0]?.tag_count).toBe(3);
  });
});

describe('buildLocalLinks', () => {
  const notes = [
    {
      id: 'a',
      title: 'آلفا',
      content_text: 'ببین [[بتا]] و [[ناموجود]]',
      is_favorite: false,
      is_archived: false,
      deleted_at: null,
      folder_id: null,
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'b',
      title: 'بتا',
      content_text: 'برگشت به [[آلفا]]',
      is_favorite: false,
      is_archived: false,
      deleted_at: null,
      folder_id: null,
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  it('resolves outgoing links and flags dangling ones', () => {
    const { links } = buildLocalLinks('a', notes);
    expect(links.map((link) => [link.target_title, link.target_note_id])).toEqual([
      ['بتا', 'b'],
      ['ناموجود', null],
    ]);
  });

  it('finds backlinks pointing at the note', () => {
    const { incoming } = buildLocalLinks('a', notes);
    expect(incoming.map((link) => link.source_note_id)).toEqual(['b']);
  });

  it('ignores trashed notes when linking', () => {
    const trashed = notes.map((note) =>
      note.id === 'b' ? { ...note, deleted_at: '2024-02-01T00:00:00Z' } : note,
    );
    const { links, incoming } = buildLocalLinks('a', trashed);
    expect(links[0]?.target_note_id).toBeNull();
    expect(incoming).toEqual([]);
  });

  it('returns nothing for an unknown note', () => {
    const { links, incoming } = buildLocalLinks('missing', notes);
    expect(links).toEqual([]);
    expect(incoming).toEqual([]);
  });
});
