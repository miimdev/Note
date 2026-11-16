'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import type { LocalNote } from '@/types/domain';
import { useNotesStore } from '@/store/notes-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteCard } from './note-card';
import { useNoteActions } from './use-note-actions';
import { useRouter } from 'next/navigation';

type Props = {
  notes: LocalNote[];
  query?: string;
  view?: 'grid' | 'list';
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  showCreate?: boolean;
  createFolderId?: string | null;
};

export function NotesList({
  notes,
  query = '',
  view = 'grid',
  loading = false,
  emptyTitle = 'هنوز یادداشتی نیست',
  emptyDescription = 'اولین یادداشت خود را بسازید؛ همه‌چیز بلافاصله ذخیره می‌شود.',
  showCreate = true,
  createFolderId = null,
}: Props) {
  const tags = useNotesStore((state) => state.tags);
  const noteTags = useNotesStore((state) => state.noteTags);
  const { createNote } = useNoteActions();
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);

  const tagNameById = React.useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags]);

  if (loading && notes.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border p-4">
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="mb-1.5 h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <p className="font-medium">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
        {showCreate && (
          <Button
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              const id = await createNote({ folderId: createFolderId });
              setCreating(false);
              if (id) router.push(`/notes/${id}`);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> یادداشت جدید
          </Button>
        )}
        <Link href="/templates" className="text-xs text-primary underline-offset-4 hover:underline">
          یا از یک قالب آماده شروع کنید
        </Link>
      </div>
    );
  }

  return (
    <div
      className={
        view === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col divide-y rounded-xl border'
      }
    >
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          query={query}
          tagNames={(noteTags.get(note.id) ?? []).map((id) => tagNameById.get(id) ?? '').filter(Boolean)}
        />
      ))}
    </div>
  );
}
