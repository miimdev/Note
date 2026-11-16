'use client';

import type { Folder, Tag, Template } from '@/types/database.types';
import { getDb } from './local-db';
import type { OutboxEntry } from '@/types/domain';

export async function putFolders(folders: Folder[]): Promise<void> {
  if (folders.length === 0) return;
  await getDb().folders.bulkPut(folders);
}

export async function getAllFolders(): Promise<Folder[]> {
  const folders = await getDb().folders.toArray();
  return folders.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export async function putTags(tags: Tag[]): Promise<void> {
  if (tags.length === 0) return;
  await getDb().tags.bulkPut(tags);
}

export async function getAllTags(): Promise<Tag[]> {
  const tags = await getDb().tags.toArray();
  return tags.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}

export async function setNoteTags(noteId: string, userId: string, tagIds: string[]): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.noteTags], async () => {
    const existing = await db.noteTags.where('note_id').equals(noteId).toArray();
    const toDelete = existing.filter((row) => !tagIds.includes(row.tag_id));
    await Promise.all(
      toDelete.map((row) =>
        db.noteTags.where('[note_id+tag_id]').equals([row.note_id, row.tag_id]).delete(),
      ),
    );
    const toAdd = tagIds.filter((id) => !existing.some((row) => row.tag_id === id));
    await Promise.all(
      toAdd.map((tagId) => db.noteTags.put({ note_id: noteId, tag_id: tagId, user_id: userId })),
    );
  });
}

export async function getNoteTagsMap(): Promise<Map<string, string[]>> {
  const rows = await getDb().noteTags.toArray();
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.note_id) ?? [];
    list.push(row.tag_id);
    map.set(row.note_id, list);
  }
  return map;
}

export async function putTemplates(templates: Template[]): Promise<void> {
  if (templates.length === 0) return;
  await getDb().templates.bulkPut(templates);
}

export async function getAllTemplates(): Promise<Template[]> {
  const templates = await getDb().templates.toArray();
  return templates.sort(
    (a, b) =>
      Number(b.is_system) - Number(a.is_system) ||
      a.position - b.position ||
      a.name.localeCompare(b.name, 'fa'),
  );
}

export async function enqueueEntity(entry: Omit<OutboxEntry, 'id'>): Promise<void> {
  await getDb().outbox.add(entry);
}
