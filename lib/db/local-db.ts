'use client';

import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  Folder,
  NoteSummary,
  NoteVersion,
  Reminder,
  Tag,
  Template,
} from '@/types/database.types';
import type { LocalNote, OutboxEntry } from '@/types/domain';

export type LocalTag = Tag;
export type LocalFolder = Folder;
export type LocalTemplate = Template;
export type LocalReminder = Reminder;
export type LocalVersion = NoteVersion;

export type MetaEntry = { key: string; value: string };

class NoteDatabase extends Dexie {
  notes!: EntityTable<LocalNote, 'id'>;
  folders!: EntityTable<LocalFolder, 'id'>;
  tags!: EntityTable<LocalTag, 'id'>;
  noteTags!: Table<{ note_id: string; tag_id: string; user_id: string }, [string, string]>;
  versions!: EntityTable<LocalVersion, 'id'>;
  reminders!: EntityTable<LocalReminder, 'id'>;
  templates!: EntityTable<LocalTemplate, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor() {
    super('note-smart-notebook');

    this.version(1).stores({
      notes:
        'id, user_id, folder_id, updated_at, title, is_pinned, is_favorite, is_archived, deleted_at, daily_date, dirty',
      folders: 'id, user_id, parent_id, position',
      tags: 'id, user_id, slug',
      noteTags: '[note_id+tag_id], note_id, tag_id, user_id',
      versions: 'id, note_id, version',
      reminders: 'id, user_id, note_id, remind_at, is_done',
      templates: 'id, user_id, is_system',
      outbox: '++id, entityId, createdAt',
      meta: 'key',
    });
  }
}

let dbInstance: NoteDatabase | undefined;

export function getDb(): NoteDatabase {
  if (typeof window === 'undefined') {
    throw new Error('The local database is only available in the browser.');
  }
  if (!dbInstance) {
    dbInstance = new NoteDatabase();
  }
  return dbInstance;
}

export async function resetLocalDatabase(): Promise<void> {
  const db = getDb();
  await Promise.all(db.tables.map((table) => table.clear()));
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await getDb().meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await getDb().meta.put({ key, value });
}

/** Cheap change detector for the pull loop. */
export async function getLastSyncAt(): Promise<string | null> {
  return getMeta('last_sync_at');
}

export async function setLastSyncAt(value: string): Promise<void> {
  await setMeta('last_sync_at', value);
}

export type { NoteSummary };

export async function clearUserData(): Promise<void> {
  const db = getDb();
  await db.transaction(
    'rw',
    [
      db.notes,
      db.folders,
      db.tags,
      db.noteTags,
      db.versions,
      db.reminders,
      db.templates,
      db.outbox,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.notes.clear(),
        db.folders.clear(),
        db.tags.clear(),
        db.noteTags.clear(),
        db.versions.clear(),
        db.reminders.clear(),
        db.templates.clear(),
        db.outbox.clear(),
        db.meta.clear(),
      ]);
    },
  );
}
