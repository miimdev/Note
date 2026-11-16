'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Archive,
  ArchiveRestore,
  Copy,
  FileText,
  FolderInput,
  MoreHorizontal,
  Pin,
  PinOff,
  Star,
  Trash2,
} from 'lucide-react';
import type { LocalNote } from '@/types/domain';
import { cn } from '@/lib/utils';
import { daysUntilPurge, relativeTime, toPersianDigits } from '@/lib/jalali';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNoteActions } from './use-note-actions';
import { useNotesStore } from '@/store/notes-store';
import { HighlightText } from '@/features/search/highlight-text';

type Props = {
  note: LocalNote;
  query?: string;
  tagNames?: string[];
};

export const NoteCard = React.memo(function NoteCard({ note, query = '', tagNames = [] }: Props) {
  const {
    togglePinned,
    toggleFavorite,
    archiveNote,
    trashNote,
    restoreNote,
    duplicateNote,
    moveNote,
    deleteForever,
  } = useNoteActions();
  const folders = useNotesStore((state) => state.folders);
  const trashMode = Boolean(note.deleted_at);
  const archiveMode = note.is_archived && !trashMode;

  const folderName = note.folder_id
    ? folders.find((folder) => folder.id === note.folder_id)?.name
    : null;
  const preview = note.content_text.replace(/\[\[|\]\]/g, '').slice(0, 200);

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border bg-card p-3.5 transition-all focus-within:border-primary/50 hover:border-primary/40 hover:shadow-sm',
        note.is_pinned && 'border-primary/30 bg-primary/[0.03]',
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm"
          aria-hidden
        >
          {note.icon ? note.icon : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            <Link
              href={trashMode ? '#' : `/notes/${note.id}`}
              className="outline-none after:absolute after:inset-0"
            >
              {note.title ? <HighlightText text={note.title} query={query} /> : 'بدون عنوان'}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {preview ? <HighlightText text={preview} query={query} /> : 'یادداشت خالی'}
          </p>
          {trashMode && note.deleted_at && (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
              {(() => {
                const days = daysUntilPurge(note.deleted_at);
                return days > 0
                  ? `${toPersianDigits(days)} روز تا حذف خودکار`
                  : 'به‌زودی حذف می‌شود';
              })()}
            </p>
          )}
        </div>

        <div className="relative z-10 flex items-center gap-0.5">
          {note.is_favorite && (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="علاقه‌مندی" />
          )}
          {note.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" aria-label="سنجاق‌شده" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="گزینه‌های یادداشت"
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {trashMode ? (
                <>
                  <DropdownMenuItem onSelect={() => void restoreNote(note.id)}>
                    <ArchiveRestore className="h-4 w-4" /> بازیابی
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive onSelect={() => void deleteForever(note.id)}>
                    <Trash2 className="h-4 w-4" /> حذف برای همیشه
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onSelect={() => void togglePinned(note.id)}>
                    {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {note.is_pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void toggleFavorite(note.id)}>
                    <Star className="h-4 w-4" />{' '}
                    {note.is_favorite ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void archiveNote(note.id, !archiveMode)}>
                    {archiveMode ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {archiveMode ? 'خروج از آرشیو' : 'آرشیو'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void duplicateNote(note.id)}>
                    <Copy className="h-4 w-4" /> ساخت کپی
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput className="h-4 w-4" /> انتقال به پوشه
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                      <DropdownMenuItem onSelect={() => void moveNote(note.id, null)}>
                        بدون پوشه
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {folders.map((folder) => (
                        <DropdownMenuItem
                          key={folder.id}
                          onSelect={() => void moveNote(note.id, folder.id)}
                        >
                          {folder.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => void trashNote(note.id)}>
                    <Trash2 className="h-4 w-4" /> انتقال به سطل زباله
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative z-0 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <time dateTime={note.updated_at}>{relativeTime(note.updated_at)}</time>
        {folderName && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{folderName}</span>
          </>
        )}
        {note.daily_date && (
          <>
            <span aria-hidden>·</span>
            <span>یادداشت روزانه</span>
          </>
        )}
        {tagNames.slice(0, 3).map((name) => (
          <span key={name} className="rounded-full bg-muted px-1.5 py-px">
            #{name}
          </span>
        ))}
        {archiveMode && <span className="rounded-full bg-muted px-1.5 py-px">آرشیو</span>}
      </div>
    </article>
  );
});
