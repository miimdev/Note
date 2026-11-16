'use client';

import * as React from 'react';
import { History, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { NoteVersion } from '@/types/database.types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatJalaliDateTime, relativeTime, toPersianDigits } from '@/lib/jalali';
import { docToText } from '@/lib/editor/content';
import { countChanges, diffLines, type DiffLine } from '@/lib/diff';
import { useNoteActions } from '@/features/notes/use-note-actions';
import { cn } from '@/lib/utils';

type Props = { noteId: string };

/** The snapshot right before `selected` (versions are newest-first). */
function previousVersion(
  versions: NoteVersion[],
  selected: NoteVersion | null,
): NoteVersion | null {
  if (!selected) return null;
  const index = versions.findIndex((version) => version.id === selected.id);
  return versions[index + 1] ?? null;
}

/** Version history with a side-by-side text diff and one-click restore. */
export function VersionsPanel({ noteId }: Props) {
  const [versions, setVersions] = React.useState<NoteVersion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<NoteVersion | null>(null);
  const [comparing, setComparing] = React.useState<NoteVersion | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const { updateNote } = useNoteActions();

  const load = React.useCallback(async () => {
    setLoading(true);
    const client = getSupabaseBrowserClient();
    const { data } = await client
      .from('note_versions')
      .select('*')
      .eq('note_id', noteId)
      .order('version', { ascending: false })
      .limit(30);
    setVersions((data ?? []) as NoteVersion[]);
    setLoading(false);
  }, [noteId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const restore = async (version: NoteVersion) => {
    setRestoring(true);
    try {
      await updateNote(noteId, { title: version.title, content: version.content });
      toast.success(`نسخه ${version.version} بازیابی شد`);
      setSelected(null);
      await load();
    } finally {
      setRestoring(false);
    }
  };

  const diff = React.useMemo<DiffLine[] | null>(() => {
    if (!selected || !comparing) return null;
    // `comparing` is the older snapshot: show what the newer one changed.
    return diffLines(docToText(comparing.content), docToText(selected.content));
  }, [selected, comparing]);

  const diffStats = React.useMemo(
    () => (diff ? countChanges(diff) : { added: 0, removed: 0 }),
    [diff],
  );

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال بارگذاری تاریخچه…
      </p>
    );
  }

  return (
    <section>
      <h3 className="muted-label mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> تاریخچه ({versions.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[11px]"
          onClick={() => void load()}
        >
          بازخوانی
        </Button>
      </h3>

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          نسخه‌ای ثبت نشده است. ویرایش‌های مهم هر ۵ دقیقه یک نسخه می‌سازند.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {versions.map((version) => (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(version);
                  setComparing(null);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-start text-xs hover:bg-accent"
              >
                <span className="truncate">{version.title || 'بدون عنوان'}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  v{version.version} · {relativeTime(version.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>نسخه {selected?.version}</DialogTitle>
            <DialogDescription>
              {selected ? formatJalaliDateTime(selected.created_at) : ''}
            </DialogDescription>
          </DialogHeader>

          {comparing && diff ? (
            <div className="rounded-lg border">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                <span>
                  v{comparing.version} ← v{selected?.version}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{toPersianDigits(diffStats.added)}
                  </span>
                  <span className="text-rose-600 dark:text-rose-400">
                    −{toPersianDigits(diffStats.removed)}
                  </span>
                </span>
              </div>
              <ol className="max-h-72 overflow-y-auto p-2 font-mono text-[11px] leading-5">
                {diff.map((line, index) => (
                  <li
                    key={`${index}-${line.op}`}
                    className={cn(
                      'whitespace-pre-wrap rounded px-1.5',
                      line.op === 'added' &&
                        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                      line.op === 'removed' &&
                        'bg-rose-500/10 text-rose-700 line-through decoration-rose-400/60 dark:text-rose-300',
                      line.op === 'equal' && 'text-muted-foreground',
                    )}
                  >
                    <span aria-hidden className="me-1.5 select-none opacity-60">
                      {line.op === 'added' ? '+' : line.op === 'removed' ? '−' : ' '}
                    </span>
                    {line.text || ' '}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium">{selected?.title || 'بدون عنوان'}</p>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-5">
                {selected ? docToText(selected.content) : ''}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {previousVersion(versions, selected) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setComparing(comparing ? null : previousVersion(versions, selected))}
              >
                {comparing ? 'بستن مقایسه' : 'مقایسه با نسخه قبلی'}
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              disabled={restoring}
              onClick={() => selected && void restore(selected)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> بازیابی این نسخه
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
