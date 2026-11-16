import { describe, expect, it } from 'vitest';
import { buildLocalNote, toSummary } from '@/lib/db/notes-repo';
import { emptyDoc } from '@/lib/editor/content';
import type { Note } from '@/types/database.types';

const serverNote: Note = {
  id: 'n1',
  user_id: 'u1',
  folder_id: null,
  title: 'عنوان',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'متن' }] }],
  },
  content_text: 'متن',
  icon: null,
  cover_url: null,
  is_pinned: false,
  is_favorite: false,
  is_archived: false,
  deleted_at: null,
  daily_date: null,
  version: 4,
  last_edited_at: '2024-05-01T10:00:00Z',
  created_at: '2024-04-01T10:00:00Z',
  updated_at: '2024-05-01T10:00:00Z',
};

describe('toSummary', () => {
  it('drops the document body but keeps everything the list needs', () => {
    const summary = toSummary(serverNote);
    expect(summary).not.toHaveProperty('content');
    expect(summary).not.toHaveProperty('search_vector');
    expect(summary.title).toBe('عنوان');
    expect(summary.version).toBe(4);
    expect(summary.content_text).toBe('متن');
  });

  it('falls back to an empty text body', () => {
    expect(toSummary({ ...serverNote, content_text: null as unknown as string }).content_text).toBe(
      '',
    );
  });
});

describe('buildLocalNote', () => {
  it('creates a dirty row that is queued for sync', () => {
    const local = buildLocalNote({
      id: 'n2',
      userId: 'u1',
      content: emptyDoc(),
      title: 'یادداشت تازه',
    });

    expect(local.dirty).toBe(1);
    expect(local.pending_op).toBe('upsert');
    expect(local.version).toBe(1);
    expect(local.base_version).toBe(0);
    expect(local.title).toBe('یادداشت تازه');
    expect(local.folder_id).toBeNull();
  });

  it('derives the title from the text when none is given', () => {
    const local = buildLocalNote({
      id: 'n3',
      userId: 'u1',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'خط اول\nخط دوم' }] }],
      },
    });
    expect(local.title).toBe('خط اول خط دوم');
  });

  it('preserves identity and flags from the existing row', () => {
    const existing = {
      ...toSummary(serverNote),
      content: serverNote.content,
      is_pinned: true,
      is_favorite: true,
      daily_date: '2024-05-01',
      base_version: 4,
    };

    const local = buildLocalNote({ id: 'n1', userId: 'u1', content: emptyDoc() }, existing);

    expect(local.created_at).toBe(existing.created_at);
    expect(local.is_pinned).toBe(true);
    expect(local.is_favorite).toBe(true);
    expect(local.daily_date).toBe('2024-05-01');
    expect(local.base_version).toBe(4);
    expect(local.version).toBe(4);
    expect(local.dirty).toBe(1);
  });

  it('keeps the folder when the draft does not specify one', () => {
    const existing = { ...toSummary(serverNote), content: serverNote.content, folder_id: 'f1' };
    expect(
      buildLocalNote({ id: 'n1', userId: 'u1', content: emptyDoc() }, existing).folder_id,
    ).toBe('f1');
    expect(
      buildLocalNote({ id: 'n1', userId: 'u1', content: emptyDoc(), folderId: null }, existing)
        .folder_id,
    ).toBe(null);
  });
});
