'use client';

import type { Note, NoteContent, NoteSummary } from '@/types/database.types';
import type { LocalNote, OutboxEntry } from '@/types/domain';
import { getDb } from './local-db';
import { docToText, deriveTitle } from '@/lib/editor/content';

export function toSummary(note: Note | LocalNote): NoteSummary {
  return {
    id: note.id,
    user_id: note.user_id,
    folder_id: note.folder_id,
    title: note.title,
    content_text: note.content_text ?? '',
    icon: note.icon ?? null,
    cover_url: note.cover_url ?? null,
    is_pinned: note.is_pinned,
    is_favorite: note.is_favorite,
    is_archived: note.is_archived,
    deleted_at: note.deleted_at,
    daily_date: note.daily_date,
    version: note.version,
    last_edited_at: note.last_edited_at,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}

export async function putNote(note: LocalNote): Promise<void> {
  await getDb().notes.put(note);
}

export async function putNotes(notes: LocalNote[]): Promise<void> {
  if (notes.length === 0) return;
  await getDb().notes.bulkPut(notes);
}

export async function getNote(id: string): Promise<LocalNote | undefined> {
  return getDb().notes.get(id);
}

export async function getAllNotes(userId?: string): Promise<LocalNote[]> {
  const db = getDb();
  if (!userId) return db.notes.toArray();
  return db.notes.where('user_id').equals(userId).toArray();
}

export async function deleteNoteLocal(id: string): Promise<void> {
  await getDb().notes.delete(id);
}

export async function enqueue(entry: Omit<OutboxEntry, 'id'>): Promise<number> {
  const id = await getDb().outbox.add(entry);
  return Number(id);
}

export async function pendingFor(noteId: string): Promise<OutboxEntry[]> {
  return getDb().outbox.where('entityId').equals(noteId).toArray();
}

/** Local optimistic save: writes the note + a queued outbox operation. */
export async function saveNoteLocally(params: {
  note: LocalNote;
  op: 'upsert' | 'delete';
  payload: unknown;
}): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.notes, db.outbox], async () => {
    await db.notes.put({ ...params.note, dirty: 1, pending_op: params.op });
    await db.outbox.add({
      entity: 'note',
      entityId: params.note.id,
      op: params.op,
      payload: params.payload,
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
    });
  });
}

export type NoteDraft = {
  id: string;
  userId: string;
  title?: string;
  content: NoteContent;
  folderId?: string | null;
  icon?: string | null;
  dailyDate?: string | null;
};

export function buildLocalNote(draft: NoteDraft, existing?: LocalNote): LocalNote {
  const now = new Date().toISOString();
  const text = docToText(draft.content);
  const title = draft.title?.trim() ? draft.title : deriveTitle(draft.content);

  return {
    id: draft.id,
    user_id: draft.userId,
    // `null` explicitly moves the note to the root; `undefined` keeps the folder.
    folder_id: draft.folderId === undefined ? (existing?.folder_id ?? null) : draft.folderId,
    title,
    content_text: text,
    icon: draft.icon ?? existing?.icon ?? null,
    cover_url: existing?.cover_url ?? null,
    is_pinned: existing?.is_pinned ?? false,
    is_favorite: existing?.is_favorite ?? false,
    is_archived: existing?.is_archived ?? false,
    deleted_at: existing?.deleted_at ?? null,
    daily_date: draft.dailyDate ?? existing?.daily_date ?? null,
    version: existing?.version ?? 1,
    last_edited_at: now,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    content: draft.content,
    dirty: 1,
    base_version: existing?.base_version ?? existing?.version ?? 0,
    pending_op: 'upsert',
    server_updated_at: existing?.server_updated_at ?? null,
  };
}
