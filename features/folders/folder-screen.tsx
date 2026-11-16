'use client';

import { FolderPlus } from 'lucide-react';
import * as React from 'react';
import { useNotesStore } from '@/store/notes-store';
import { NotesView } from '@/features/notes/notes-view';
import { ImportMarkdownButton } from '@/features/export/import-markdown';
import { NewFolderDialog } from './new-folder-dialog';
import { Button } from '@/components/ui/button';

export function FolderScreen({ folderId }: { folderId: string }) {
  const folders = useNotesStore((state) => state.folders);
  const folder = folders.find((item) => item.id === folderId);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <FolderPlus className="h-3.5 w-3.5" /> زیرپوشه
        </Button>
        <ImportMarkdownButton folderId={folderId} />
      </div>
      <NotesView
        title={folder ? `📁 ${folder.name}` : 'پوشه'}
        scope="folder"
        folderId={folderId}
        createFolderId={folderId}
        emptyTitle="این پوشه خالی است"
        emptyDescription="اولین یادداشت این پوشه را بسازید."
      />
      <NewFolderDialog open={dialogOpen} onOpenChange={setDialogOpen} parentId={folderId} />
    </div>
  );
}
