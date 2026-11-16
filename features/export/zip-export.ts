'use client';

import { zipSync, strToU8 } from 'fflate';
import { getDb } from '@/lib/db/local-db';
import { docToMarkdown } from '@/lib/editor/content';
import { downloadBlob, safeFileName } from './export-utils';

/** Bundles every note into a single .zip of Markdown files (plus a JSON backup). */
export async function exportAllAsZip(): Promise<void> {
  const db = getDb();
  const notes = await db.notes.toArray();
  const folders = await db.folders.toArray();

  const folderById = new Map(folders.map((folder) => [folder.id, folder.name]));
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();

  for (const note of notes) {
    if (note.deleted_at) continue;
    const folder = note.folder_id ? folderById.get(note.folder_id) : null;
    const base = safeFileName(note.title || 'بدون-عنوان');
    let name = `${folder ? `${safeFileName(folder)}/` : ''}${base}.md`;
    let counter = 2;
    while (used.has(name)) {
      name = `${folder ? `${safeFileName(folder)}/` : ''}${base}-${counter}.md`;
      counter += 1;
    }
    used.add(name);
    files[name] = strToU8(docToMarkdown(note.content ?? { type: 'doc', content: [] }, note.title));
  }

  files['backup.json'] = strToU8(
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        folders,
        notes: notes.map((note) => ({ ...note, dirty: undefined, pending_op: undefined })),
      },
      null,
      2,
    ),
  );

  const zipped = zipSync(files, { level: 6 });
  downloadBlob(
    zipped,
    `note-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    'application/zip',
  );
}
