import { beforeEach, describe, expect, it } from 'vitest';
import {
  getDb,
  getLastSyncAt,
  resetLocalDatabase,
  setLastSyncAt,
  clearUserData,
} from '@/lib/db/local-db';
import { buildLocalNote, enqueue, getAllNotes, saveNoteLocally } from '@/lib/db/notes-repo';
import { emptyDoc } from '@/lib/editor/content';

const note = (id: string, overrides: Partial<Parameters<typeof buildLocalNote>[0]> = {}) =>
  buildLocalNote({ id, userId: 'u1', title: id, content: emptyDoc(), ...overrides });

beforeEach(async () => {
  await resetLocalDatabase();
});

describe('clearUserData', () => {
  it('empties every table', async () => {
    const db = getDb();
    await db.notes.put(note('n1'));
    await db.meta.put({ key: 'k', value: 'v' });
    await clearUserData();
    expect(await db.notes.count()).toBe(0);
    expect(await db.meta.count()).toBe(0);
  });
});

describe('note repository', () => {
  it('saves the note and queues exactly one outbox entry per save', async () => {
    const db = getDb();
    await saveNoteLocally({ note: note('n1'), op: 'upsert', payload: { id: 'n1' } });
    await saveNoteLocally({
      note: { ...note('n1'), title: 'ویرایش شد' },
      op: 'upsert',
      payload: { id: 'n1' },
    });

    const stored = await db.notes.get('n1');
    expect(stored?.title).toBe('ویرایش شد');
    expect(stored?.dirty).toBe(1);
    expect(stored?.pending_op).toBe('upsert');
    expect(await db.outbox.count()).toBe(2);
  });

  it('filters notes by user', async () => {
    await getDb().notes.bulkPut([note('a'), note('b', { userId: 'u2' })]);
    expect(await getAllNotes('u1')).toHaveLength(1);
    expect(await getAllNotes()).toHaveLength(2);
  });

  it('queues outbox entries with incrementing numeric ids', async () => {
    const entry = {
      entity: 'note' as const,
      entityId: 'n1',
      op: 'upsert' as const,
      payload: {},
      createdAt: Date.now(),
      attempts: 0,
    };
    const first = await enqueue(entry);
    const second = await enqueue(entry);
    expect(typeof first).toBe('number');
    expect(second).toBeGreaterThan(first);
  });

  it('stores compound note-tag rows without collisions', async () => {
    const db = getDb();
    await db.noteTags.bulkPut([
      { note_id: 'n1', tag_id: 't1', user_id: 'u1' },
      { note_id: 'n1', tag_id: 't2', user_id: 'u1' },
    ]);
    await db.noteTags.put({ note_id: 'n1', tag_id: 't1', user_id: 'u1' });
    expect(await db.noteTags.count()).toBe(2);

    await db.noteTags.where('[note_id+tag_id]').equals(['n1', 't1']).delete();
    expect(await db.noteTags.count()).toBe(1);
  });
});

describe('sync metadata', () => {
  it('round-trips the last sync timestamp', async () => {
    expect(await getLastSyncAt()).toBeNull();
    await setLastSyncAt('2024-06-01T00:00:00.000Z');
    expect(await getLastSyncAt()).toBe('2024-06-01T00:00:00.000Z');
  });
});
