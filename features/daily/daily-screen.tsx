'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotesStore } from '@/store/notes-store';
import { useNoteActions } from '@/features/notes/use-note-actions';
import { useUiStore } from '@/store/ui-store';
import {
  formatDailyTitle,
  formatJalaliDate,
  isoToday,
  jalaliWeekdayLabel,
  toJalali,
  formatGregorianDate,
} from '@/lib/jalali';
import { toPersianDigits } from '@/lib/jalali';
import { NoteEditor } from '@/features/editor/components/note-editor';
import { useSync } from '@/features/sync/sync-provider';
import { cn } from '@/lib/utils';
import { noteHref } from '@/lib/paths';

export function DailyScreen() {
  const router = useRouter();
  const { userId } = useSync();
  const notes = useNotesStore((state) => state.notes);
  const calendar = useUiStore((state) => state.calendar);
  const setCalendar = useUiStore((state) => state.setCalendar);
  const { ensureDailyNote } = useNoteActions();
  const [date, setDate] = React.useState(isoToday());
  const [creating, setCreating] = React.useState(false);

  const title =
    calendar === 'jalali' ? formatDailyTitle(date, 'jalali') : formatDailyTitle(date, 'gregorian');
  const existing = notes.find((note) => note.daily_date === date && !note.deleted_at);

  React.useEffect(() => {
    if (existing || !userId) return;
    let active = true;
    setCreating(true);
    void ensureDailyNote(date, title).finally(() => {
      if (active) setCreating(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, userId]);

  const shift = (days: number) => {
    const current = new Date(`${date}T12:00:00`);
    current.setDate(current.getDate() + days);
    const offset = current.getTimezoneOffset() * 60_000;
    setDate(new Date(current.getTime() - offset).toISOString().slice(0, 10));
  };

  const recentDaily = notes
    .filter((note) => note.daily_date && !note.deleted_at && note.daily_date !== date)
    .sort((a, b) => (b.daily_date ?? '').localeCompare(a.daily_date ?? ''))
    .slice(0, 7);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <CalendarDays className="h-5 w-5 text-primary" />
            {title}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {jalaliWeekdayLabel(date)} · {formatJalaliDate(date)} · {formatGregorianDate(date)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCalendar('jalali')}
              aria-pressed={calendar === 'jalali'}
              className={cn('rounded px-2 py-1', calendar === 'jalali' && 'bg-accent font-medium')}
            >
              شمسی
            </button>
            <button
              type="button"
              onClick={() => setCalendar('gregorian')}
              aria-pressed={calendar === 'gregorian'}
              className={cn(
                'rounded px-2 py-1',
                calendar === 'gregorian' && 'bg-accent font-medium',
              )}
            >
              میلادی
            </button>
          </div>
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="روز قبل">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(isoToday())}>
            امروز
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="روز بعد">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {creating && !existing ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> در حال ساخت یادداشت روزانه…
        </p>
      ) : existing && userId ? (
        <div className="rounded-xl border bg-card p-4">
          <NoteEditor
            key={existing.id}
            noteId={existing.id}
            userId={userId}
            initialTitle={existing.title}
            initialContent={existing.content ?? { type: 'doc', content: [{ type: 'paragraph' }] }}
            onOpenWikiLink={(linkTitle) => {
              const target = notes.find((note) => note.title === linkTitle);
              if (target) router.push(noteHref(target.id));
            }}
          />
        </div>
      ) : (
        <Button onClick={() => void ensureDailyNote(date, title)} className="w-fit">
          ساخت یادداشت این روز
        </Button>
      )}

      {recentDaily.length > 0 && (
        <section>
          <h2 className="muted-label mb-2">روزهای اخیر</h2>
          <ul className="flex flex-wrap gap-1.5">
            {recentDaily.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => note.daily_date && setDate(note.daily_date)}
                  className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                >
                  {note.daily_date ? formatJalaliDate(`${note.daily_date}T12:00:00`) : ''}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-dashed p-4 text-xs leading-6 text-muted-foreground">
        <p>
          نکته: هر روز فقط یک یادداشت روزانه ساخته می‌شود. تاریخ شمسی به‌صورت پیش‌فرض استفاده می‌شود
          و می‌توانید آن را از دکمه‌های بالا یا تنظیمات تغییر دهید.
        </p>
        <p className="mt-1">
          امروز: {formatJalaliDate(new Date())} ({toPersianDigits(toJalali(new Date()).year)}) —
          تاریخ شمسی با الگوریتم داخلی و بدون وابستگی به مرورگر محاسبه می‌شود.
        </p>
      </section>
    </div>
  );
}
