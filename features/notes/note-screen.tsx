'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  Bell,
  CloudOff,
  Focus,
  Globe,
  History,
  Link2,
  PanelRightClose,
  PanelRightOpen,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { NoteContent } from '@/types/database.types';
import type { LocalNote } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDb } from '@/lib/db/local-db';
import { docToText } from '@/lib/editor/content';
import { buildTitleIndex } from '@/lib/links';
import { useNotesStore } from '@/store/notes-store';
import { useUiStore } from '@/store/ui-store';
import { useSync } from '@/features/sync/sync-provider';
import { useNoteActions } from './use-note-actions';
import { BacklinksPanel } from '@/features/links/backlinks-panel';
import { NoteTagEditor } from '@/features/tags/note-tag-editor';
import { NoteFolderPicker } from './note-folder-picker';
import { VersionsPanel } from '@/features/versions/versions-panel';
import { ShareDialog } from '@/features/share/share-dialog';
import { ReminderDialog } from '@/features/reminders/reminder-dialog';
import { ExportMenu } from '@/features/export/export-menu';
import { AiPanel } from '@/features/ai/ai-panel';
import { cn } from '@/lib/utils';
import { noteHref } from '@/lib/paths';

const NoteEditor = dynamic(
  () => import('@/features/editor/components/note-editor').then((mod) => mod.NoteEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  },
);

type PanelTab = 'links' | 'tags' | 'versions';

export function NoteScreen({ noteId }: { noteId: string }) {
  const router = useRouter();
  const { userId } = useSync();
  const notes = useNotesStore((state) => state.notes);
  const hydrated = useNotesStore((state) => state.hydrated);
  const { toggleFavorite, trashNote, restoreNote } = useNoteActions();
  const focusMode = useUiStore((state) => state.focusMode);
  const toggleFocusMode = useUiStore((state) => state.toggleFocusMode);

  const [note, setNote] = React.useState<LocalNote | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [tab, setTab] = React.useState<PanelTab>('links');
  const [shareOpen, setShareOpen] = React.useState(false);
  const [reminderOpen, setReminderOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function load() {
      // `notes` is rewritten on every sync pull, so the note may be on the
      // server while this device has not cached it yet.
      const fromStore = useNotesStore.getState().notes.find((item) => item.id === noteId);
      const local = fromStore ?? (await getDb().notes.get(noteId));
      if (!active) return;
      if (local) {
        setNote(local);
        setMissing(false);
        return;
      }
      // Only report a missing note once the local store is hydrated.
      if (useNotesStore.getState().hydrated) setMissing(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, [noteId, hydrated]);

  const storeNote = notes.find((item) => item.id === noteId);
  React.useEffect(() => {
    if (storeNote) setNote(storeNote);
  }, [storeNote]);

  const titleIndex = React.useMemo(
    () => buildTitleIndex(notes.filter((item) => !item.deleted_at)),
    [notes],
  );

  const openWikiLink = React.useCallback(
    async (title: string) => {
      const existing = titleIndex.get(title.trim().toLowerCase());
      if (existing) {
        router.push(noteHref(existing));
        return;
      }
      toast.info(`یادداشتی با عنوان «${title}» وجود ندارد`, {
        description: 'با ساختن یادداشتی با همین عنوان، لینک خودکار وصل می‌شود.',
      });
    },
    [router, titleIndex],
  );

  if (missing && hydrated) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-lg font-semibold">این یادداشت پیدا نشد</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ممکن است حذف شده باشد یا هنوز روی این دستگاه همگام نشده باشد.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/notes">بازگشت به همه یادداشت‌ها</Link>
        </Button>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const content: NoteContent = note.content ?? { type: 'doc', content: [{ type: 'paragraph' }] };
  const trashed = Boolean(note.deleted_at);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div
        className={cn(
          'no-print flex flex-wrap items-center gap-2',
          focusMode && 'opacity-30 hover:opacity-100',
        )}
      >
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/notes">
            <ArrowRight className="h-3.5 w-3.5" /> یادداشت‌ها
          </Link>
        </Button>

        <div className="ms-auto flex flex-wrap items-center gap-1">
          {trashed ? (
            <Button size="sm" variant="outline" onClick={() => void restoreNote(noteId)}>
              بازیابی از سطل زباله
            </Button>
          ) : (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={note.is_favorite ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}
                aria-pressed={note.is_favorite}
                onClick={() => void toggleFavorite(noteId)}
              >
                <Star
                  className={cn('h-4 w-4', note.is_favorite && 'fill-amber-400 text-amber-400')}
                />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="یادآور"
                onClick={() => setReminderOpen(true)}
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => setShareOpen(true)}
              >
                <Globe className="h-3.5 w-3.5" /> اشتراک
              </Button>
              <ExportMenu noteId={noteId} title={note.title} content={content} />
              <AiPanel
                text={docToText(content)}
                insertLabel="کپی نتیجه"
                onInsert={(value) => {
                  void navigator.clipboard
                    .writeText(value)
                    .then(() => toast.success('نتیجه در کلیپ‌بورد کپی شد'));
                }}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={focusMode ? 'خروج از حالت تمرکز' : 'حالت تمرکز'}
                aria-pressed={focusMode}
                onClick={toggleFocusMode}
              >
                <Focus className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={panelOpen ? 'بستن پنل کنار' : 'باز کردن پنل کنار'}
                onClick={() => setPanelOpen((value) => !value)}
              >
                {panelOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="حذف"
                onClick={() => void trashNote(noteId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {note.cover_url && !focusMode && (
        <div className="h-40 w-full overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={note.cover_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <NoteEditor
            noteId={noteId}
            userId={userId ?? ''}
            initialTitle={note.title}
            initialContent={content}
            onOpenWikiLink={openWikiLink}
            readOnly={trashed}
          />
        </div>

        {panelOpen && !focusMode && (
          <aside
            className="no-print hidden w-72 shrink-0 flex-col gap-5 border-s ps-4 lg:flex"
            aria-label="پنل اطلاعات"
          >
            <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs" role="tablist">
              {[
                { id: 'links' as const, label: 'پیوندها', icon: Link2 },
                { id: 'tags' as const, label: 'برچسب', icon: Star },
                { id: 'versions' as const, label: 'تاریخچه', icon: History },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={tab === item.id}
                    onClick={() => setTab(item.id)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 transition-colors',
                      tab === item.id
                        ? 'bg-background font-medium shadow-sm'
                        : 'text-muted-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {tab === 'links' && (
              <>
                <NoteFolderPicker noteId={noteId} folderId={note.folder_id} />
                <BacklinksPanel noteId={noteId} />
              </>
            )}
            {tab === 'tags' && <NoteTagEditor noteId={noteId} />}
            {tab === 'versions' && <VersionsPanel noteId={noteId} />}

            <div className="mt-auto flex flex-col gap-1.5 text-[11px] text-muted-foreground">
              <span>نسخه {note.version}</span>
              <span>آخرین ویرایش محلی: {new Date(note.updated_at).toLocaleString('fa-IR')}</span>
              {note.dirty ? (
                <span className="text-amber-600">تغییرات در انتظار همگام‌سازی</span>
              ) : null}
            </div>
          </aside>
        )}
      </div>

      <ShareDialog
        noteId={noteId}
        userId={userId ?? ''}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
      <ReminderDialog
        noteId={noteId}
        noteTitle={note.title}
        open={reminderOpen}
        onOpenChange={setReminderOpen}
      />

      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <p className="no-print flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CloudOff className="h-3 w-3" /> آفلاین — تغییرات محلی ذخیره می‌شوند
        </p>
      )}
    </div>
  );
}
