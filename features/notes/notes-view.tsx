'use client';

import * as React from 'react';
import type { NoteSort } from '@/types/domain';
import type { LocalNote } from '@/types/domain';
import { useNotesStore } from '@/store/notes-store';
import { useUiStore } from '@/store/ui-store';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { matchesQuery } from '@/lib/search-query';
import { NotesFilterBar } from './notes-filter-bar';
import { NotesList } from './notes-list';

type NotesViewProps = {
  title: string;
  notes?: LocalNote[];
  scope?: 'all' | 'favorites' | 'archive' | 'trash' | 'folder' | 'tag';
  folderId?: string | null;
  tagId?: string | null;
  createFolderId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function applySort(notes: LocalNote[], sort: NoteSort): LocalNote[] {
  const sorted = [...notes];
  sorted.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    switch (sort) {
      case 'updated_asc':
        return a.updated_at.localeCompare(b.updated_at);
      case 'created_desc':
        return b.created_at.localeCompare(a.created_at);
      case 'created_asc':
        return a.created_at.localeCompare(b.created_at);
      case 'title_asc':
        return a.title.localeCompare(b.title, 'fa');
      case 'title_desc':
        return b.title.localeCompare(a.title, 'fa');
      case 'updated_desc':
      default:
        return b.updated_at.localeCompare(a.updated_at);
    }
  });
  return sorted;
}

export function useFilteredNotes(options: {
  scope: NonNullable<NotesViewProps['scope']>;
  folderId?: string | null;
  tagId?: string | null;
  query: string;
  sort: NoteSort;
  favoritesOnly: boolean;
  showArchived: boolean;
}) {
  const allNotes = useNotesStore((state) => state.notes);
  const noteTags = useNotesStore((state) => state.noteTags);
  const folderIds = useNotesStore((state) => state.folders);

  return React.useMemo(() => {
    const childrenByParent = new Map<string | null, string[]>();
    for (const folder of folderIds) {
      const list = childrenByParent.get(folder.parent_id) ?? [];
      list.push(folder.id);
      childrenByParent.set(folder.parent_id, list);
    }

    const collectFolders = (rootId: string): Set<string> => {
      const result = new Set<string>([rootId]);
      const stack = [rootId];
      while (stack.length) {
        const current = stack.pop()!;
        for (const child of childrenByParent.get(current) ?? []) {
          if (!result.has(child)) {
            result.add(child);
            stack.push(child);
          }
        }
      }
      return result;
    };

    const folderSet = options.folderId ? collectFolders(options.folderId) : null;

    let result = allNotes.filter((note) => {
      if (options.scope === 'trash') return Boolean(note.deleted_at);
      if (note.deleted_at) return false;

      if (options.scope === 'archive') return note.is_archived;
      if (note.is_archived && !options.showArchived) return false;

      if (options.scope === 'favorites' && !note.is_favorite) return false;
      if (options.favoritesOnly && !note.is_favorite) return false;

      if (folderSet && (!note.folder_id || !folderSet.has(note.folder_id))) return false;
      if (options.tagId && !(noteTags.get(note.id) ?? []).includes(options.tagId)) return false;

      if (options.query.trim() && !matchesQuery({ title: note.title, text: note.content_text }, options.query)) {
        return false;
      }

      return true;
    });

    result = applySort(result, options.sort);
    return result;
  }, [allNotes, noteTags, options, folderIds]);
}

export function NotesView({
  title,
  notes,
  scope = 'all',
  folderId = null,
  tagId = null,
  createFolderId = null,
  emptyTitle,
  emptyDescription,
}: NotesViewProps) {
  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(scope === 'archive');
  const sort = useUiStore((state) => state.sort);
  const setSort = useUiStore((state) => state.setSort);
  const loading = useNotesStore((state) => state.loading);
  const debouncedQuery = useDebouncedValue(query, 200);

  const filtered = useFilteredNotes({
    scope,
    folderId,
    tagId,
    query: notes ? '' : debouncedQuery,
    sort,
    favoritesOnly,
    showArchived,
  });

  const base = notes
    ? notes.filter((note) =>
        debouncedQuery.trim() ? matchesQuery({ title: note.title, text: note.content_text }, debouncedQuery) : true,
      )
    : filtered;

  return (
    <div className="flex flex-col gap-4">
      <NotesFilterBar
        title={title}
        count={base.length}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        favoritesOnly={favoritesOnly}
        onFavoritesChange={setFavoritesOnly}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />
      <NotesList
        notes={base}
        query={debouncedQuery}
        view={view}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        showCreate={scope !== 'trash'}
        createFolderId={createFolderId}
      />
    </div>
  );
}
