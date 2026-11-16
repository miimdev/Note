'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { IS_STATIC_EXPORT, STATIC_ROUTE_PARAM } from '@/lib/paths';
import { NotesView } from '@/features/notes/notes-view';
import { NoteScreen } from '@/features/notes/note-screen';
import { ImportMarkdownButton } from '@/features/export/import-markdown';
import { FolderScreen } from '@/features/folders/folder-screen';
import { TagScreen, TagsPage as TagsManagerPage } from '@/features/tags/tag-screen';

/**
 * Static hosts have no dynamic routes, so the pages that used to be
 * `/notes/[id]`, `/folders/[id]` and `/tags/[slug]` read the identifier from
 * `?id=` instead (see lib/paths.ts). These components pick between "one item"
 * and "list" at runtime; the server build keeps using the `[id]` routes.
 */
function useStaticId(): string | null {
  const value = useSearchParams().get(STATIC_ROUTE_PARAM);
  return IS_STATIC_EXPORT ? value : null;
}

export function NotesRoute() {
  const id = useStaticId();
  if (id) return <NoteScreen noteId={id} />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex justify-end">
        <ImportMarkdownButton />
      </div>
      <NotesView title="همه یادداشت‌ها" scope="all" />
    </div>
  );
}

export function FoldersRoute() {
  const id = useStaticId();
  if (id) return <FolderScreen folderId={id} />;

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
      یک پوشه را از نوار کناری انتخاب کنید.
    </div>
  );
}

export function TagsRoute() {
  const slug = useStaticId();
  if (slug) return <TagScreen slug={slug} />;
  return <TagsManagerPage />;
}
