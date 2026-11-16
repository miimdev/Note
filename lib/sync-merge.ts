import type { Note } from '@/types/database.types';

export type MergeOutcome =
  | { kind: 'local-newer'; reason: 'no-remote' | 'remote-unchanged' }
  | { kind: 'remote-newer'; reason: 'no-local' | 'local-clean' }
  | { kind: 'conflict'; reason: 'both-changed' }
  | { kind: 'identical' };

export type MergeInput = {
  local:
    | (Pick<Note, 'id' | 'title' | 'content' | 'updated_at' | 'version'> & { dirty?: boolean })
    | null;
  remote: Pick<Note, 'id' | 'title' | 'content' | 'updated_at' | 'version'> | null;
  baseVersion?: number | null;
};

/**
 * Conflict policy:
 *  - nothing remote  -> keep local
 *  - local untouched  -> take remote
 *  - both touched, remote version is not newer than the version we started from
 *    (i.e. only our device changed) -> keep local
 *  - both touched and the remote moved forward -> conflict, the user decides
 */
export function mergeNote({ local, remote, baseVersion }: MergeInput): MergeOutcome {
  if (!local && !remote) return { kind: 'identical' };
  if (!remote) return { kind: 'local-newer', reason: 'no-remote' };
  if (!local) return { kind: 'remote-newer', reason: 'no-local' };

  if (!local.dirty) return { kind: 'remote-newer', reason: 'local-clean' };

  const remoteMoved = typeof baseVersion === 'number' ? remote.version > baseVersion : remote.version > local.version;

  if (!remoteMoved) {
    return { kind: 'local-newer', reason: 'remote-unchanged' };
  }

  if (remote.content === undefined || isSameContent(local, remote)) {
    return { kind: 'identical' };
  }

  return { kind: 'conflict', reason: 'both-changed' };
}

export function isSameContent(
  a: Pick<Note, 'title' | 'content'>,
  b: Pick<Note, 'title' | 'content'>,
): boolean {
  return a.title === b.title && JSON.stringify(a.content) === JSON.stringify(b.content);
}

export type OutboxItem = {
  id?: number;
  entityId: string;
  createdAt: number;
  attempts: number;
};

/** Exponential backoff with jitter, capped at 60s. */
export function backoffDelay(attempts: number): number {
  const base = Math.min(60_000, 2 ** attempts * 500);
  const jitter = Math.random() * 250;
  return base + jitter;
}

/** Drops older duplicates of the same entity, keeping the newest operation. */
export function coalesceOutbox<T extends OutboxItem>(items: T[]): T[] {
  const byEntity = new Map<string, T>();
  for (const item of [...items].sort((a, b) => b.createdAt - a.createdAt)) {
    if (!byEntity.has(item.entityId)) byEntity.set(item.entityId, item);
  }
  return [...byEntity.values()].sort((a, b) => a.createdAt - b.createdAt);
}

/** A note belongs in the "due" list when the reminder time has passed. */
export function isDue(remindAt: string, now = Date.now(), graceMs = 60_000): boolean {
  return new Date(remindAt).getTime() <= now + graceMs;
}

/**
 * LWW-safe version bump: the client never sends a lower version than the
 * server, so triggers keep incrementing monotonically.
 */
export function nextVersion(localVersion: number, remoteVersion?: number | null): number {
  return Math.max(localVersion, remoteVersion ?? 0);
}
