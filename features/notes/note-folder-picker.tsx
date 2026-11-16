'use client';

import * as React from 'react';
import { Folder as FolderIcon } from 'lucide-react';
import { useNotesStore } from '@/store/notes-store';
import { useNoteActions } from './use-note-actions';

export function NoteFolderPicker({ noteId, folderId }: { noteId: string; folderId: string | null }) {
  const folders = useNotesStore((state) => state.folders);
  const { moveNote } = useNoteActions();

  const options = React.useMemo(() => {
    const byParent = new Map<string | null, typeof folders>();
    for (const folder of folders) {
      const list = byParent.get(folder.parent_id) ?? [];
      list.push(folder);
      byParent.set(folder.parent_id, list);
    }
    const flat: { id: string; label: string }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const folder of byParent.get(parentId) ?? []) {
        flat.push({ id: folder.id, label: `${'— '.repeat(depth)}${folder.name}` });
        walk(folder.id, depth + 1);
      }
    };
    walk(null, 0);
    return flat;
  }, [folders]);

  return (
    <section>
      <h3 className="muted-label mb-2 flex items-center gap-1.5">
        <FolderIcon className="h-3.5 w-3.5" /> پوشه
      </h3>
      <select
        value={folderId ?? ''}
        onChange={(event) => void moveNote(noteId, event.target.value || null)}
        aria-label="انتخاب پوشه"
        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
      >
        <option value="">بدون پوشه</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </section>
  );
}
