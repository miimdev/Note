'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Folder, Note, Tag, Template, Reminder } from '@/types/database.types';
import { getDb } from '@/lib/db/local-db';
import { toSummary } from '@/lib/db/notes-repo';
import { mergeNote } from '@/lib/sync-merge';
import type { LocalNote } from '@/types/domain';

export const NOTE_COLUMNS =
  'id,user_id,folder_id,title,content,content_text,icon,cover_url,is_pinned,is_favorite,is_archived,deleted_at,daily_date,version,last_edited_at,created_at,updated_at';

export const ALL_TABLES = [
  'notes',
  'folders',
  'tags',
  'note_tags',
  'templates',
  'reminders',
] as const;

/** Adds local-only bookkeeping columns to a server row. */
export function stampLocalWith<T extends { updated_at: string }>(row: T) {
  return { ...row, server_updated_at: row.updated_at };
}

export async function pullNotes(client: SupabaseClient, userId: string, since?: string | null) {
  let query = client
    .from('notes')
    .select(NOTE_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (since) query = query.gt('updated_at', since);

  const { data, error } = await query;
  if (error) throw error;

  const db = getDb();
  const rows = (data ?? []) as Note[];
  const localById = new Map((await db.notes.toArray()).map((note) => [note.id, note]));

  const payload: LocalNote[] = [];
  const conflicts: Note[] = [];

  for (const row of rows) {
    const local = localById.get(row.id);

    if (local?.dirty) {
      // Local edits are pending. Only a *newer* server copy is a real conflict;
      // otherwise the outbox wins and nothing is lost.
      const outcome = mergeNote({
        local: {
          id: local.id,
          title: local.title,
          content: local.content ?? { type: 'doc', content: [] },
          updated_at: local.updated_at,
          version: local.version,
          dirty: true,
        },
        remote: row,
        baseVersion: local.base_version ?? null,
      });
      if (outcome.kind === 'conflict') conflicts.push(row);
      continue;
    }

    payload.push({
      ...toSummary(row),
      content: row.content,
      dirty: 0 as const,
      pending_op: null,
      base_version: row.version,
      server_updated_at: row.updated_at,
    });
  }

  if (payload.length > 0) await db.notes.bulkPut(payload);
  return { rows, conflicts, newest: rows[0]?.updated_at ?? since ?? null };
}

export async function pullFolders(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('position');
  if (error) throw error;
  const db = getDb();
  await db.folders.clear();
  if (data?.length) await db.folders.bulkPut(data as Folder[]);
  return (data ?? []) as Folder[];
}

export async function pullTags(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from('tags').select('*').eq('user_id', userId);
  if (error) throw error;
  const db = getDb();
  await db.tags.clear();
  if (data?.length) await db.tags.bulkPut(data as Tag[]);

  const { data: links } = await client.from('note_tags').select('*').eq('user_id', userId);
  await db.noteTags.clear();
  if (links?.length) {
    await db.noteTags.bulkPut(
      links.map((row) => ({ note_id: row.note_id, tag_id: row.tag_id, user_id: row.user_id })),
    );
  }
  return { tags: (data ?? []) as Tag[], links: links ?? [] };
}

export async function pullTemplates(client: SupabaseClient) {
  const { data, error } = await client.from('templates').select('*').order('position');
  if (error) throw error;
  const db = getDb();
  await db.templates.clear();
  if (data?.length) await db.templates.bulkPut(data as Template[]);
  return (data ?? []) as Template[];
}

export async function pullReminders(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('is_done', false)
    .order('remind_at');
  if (error) throw error;
  const db = getDb();
  await db.reminders.clear();
  if (data?.length) await db.reminders.bulkPut(data as Reminder[]);
  return (data ?? []) as Reminder[];
}
