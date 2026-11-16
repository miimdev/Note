import { describe, expect, it } from 'vitest';
import {
  backoffDelay,
  coalesceOutbox,
  isDue,
  isSameContent,
  mergeNote,
  nextVersion,
} from '@/lib/sync-merge';
import type { Note } from '@/types/database.types';

type TestNote = Pick<
  Note,
  'id' | 'user_id' | 'title' | 'content' | 'updated_at' | 'version' | 'created_at'
> & { dirty?: boolean; deleted_at?: string | null };

const note = (overrides: Partial<TestNote> = {}): TestNote => ({
  id: 'n1',
  user_id: 'u1',
  title: 'T',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('mergeNote', () => {
  it('keeps local data when there is no remote copy', () => {
    expect(mergeNote({ local: note({ dirty: true }), remote: null })).toEqual({
      kind: 'local-newer',
      reason: 'no-remote',
    });
  });

  it('takes the remote copy when the local one is clean', () => {
    expect(mergeNote({ local: note({ dirty: false }), remote: note({ version: 2 }) })).toEqual({
      kind: 'remote-newer',
      reason: 'local-clean',
    });
  });

  it('keeps local edits when the remote never moved past the base version', () => {
    expect(
      mergeNote({
        local: note({ dirty: true, version: 3 }),
        remote: note({ version: 3 }),
        baseVersion: 3,
      }),
    ).toEqual({ kind: 'local-newer', reason: 'remote-unchanged' });
  });

  it('reports a conflict when both sides changed', () => {
    const outcome = mergeNote({
      local: note({ dirty: true, version: 2, title: 'Local' }),
      remote: note({ version: 5, title: 'Remote' }),
      baseVersion: 2,
    });
    expect(outcome.kind).toBe('conflict');
  });
});

describe('isSameContent', () => {
  it('compares title and deep content', () => {
    expect(isSameContent(note(), note())).toBe(true);
    expect(isSameContent(note(), note({ title: 'Other' }))).toBe(false);
  });
});

describe('backoffDelay', () => {
  it('grows and stays capped', () => {
    expect(backoffDelay(0)).toBeLessThan(backoffDelay(5));
    expect(backoffDelay(30)).toBeLessThanOrEqual(60_250);
  });
});

describe('coalesceOutbox', () => {
  it('keeps only the newest operation per entity', () => {
    const result = coalesceOutbox([
      { entityId: 'a', createdAt: 1, attempts: 0 },
      { entityId: 'a', createdAt: 5, attempts: 0 },
      { entityId: 'b', createdAt: 3, attempts: 0 },
    ]);
    expect(result.map((item) => item.entityId)).toEqual(['b', 'a']);
    expect(result[1]?.createdAt).toBe(5);
  });
});

describe('isDue', () => {
  it('detects past reminders', () => {
    expect(isDue(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isDue(new Date(Date.now() + 3_600_000).toISOString())).toBe(false);
  });
});

describe('nextVersion', () => {
  it('never goes backwards', () => {
    expect(nextVersion(3, 5)).toBe(5);
    expect(nextVersion(7, 2)).toBe(7);
    expect(nextVersion(1)).toBe(1);
  });
});
