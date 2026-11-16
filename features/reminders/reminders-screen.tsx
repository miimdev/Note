'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Reminder } from '@/types/database.types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useNotesStore } from '@/store/notes-store';
import { useSync } from '@/features/sync/sync-provider';
import { Button } from '@/components/ui/button';
import { formatJalaliDateTime, relativeTime } from '@/lib/jalali';
import { requestNotificationPermission } from './notifications';

export function RemindersScreen() {
  const { userId } = useSync();
  const notes = useNotesStore((state) => state.notes);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const client = getSupabaseBrowserClient();
    const { data } = await client
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('remind_at');
    setReminders((data ?? []) as Reminder[]);
    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const complete = async (reminder: Reminder) => {
    const client = getSupabaseBrowserClient();
    const { error } = await client
      .from('reminders')
      .update({ is_done: true })
      .eq('id', reminder.id);
    if (error) {
      toast.error('به‌روزرسانی ناموفق بود');
      return;
    }
    setReminders(
      reminders.map((item) => (item.id === reminder.id ? { ...item, is_done: true } : item)),
    );
  };

  const noteTitle = (noteId: string) =>
    notes.find((note) => note.id === noteId)?.title || 'یادداشت';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Bell className="h-5 w-5 text-primary" /> یادآورها
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اعلان‌ها از طریق مرورگر ارسال می‌شوند.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void requestNotificationPermission().then((ok) =>
              toast[ok ? 'success' : 'error'](ok ? 'اعلان‌ها فعال شد' : 'اجازه اعلان داده نشد'),
            )
          }
        >
          فعال‌سازی اعلان
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center">
          <BellOff className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">یادآوری ثبت نشده است</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            در صفحه هر یادداشت، از دکمه زنگ، یک یادآور اضافه کنید.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {reminders.map((reminder) => {
            const overdue =
              !reminder.is_done && new Date(reminder.remind_at).getTime() < Date.now();
            return (
              <li key={reminder.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span
                  className={
                    reminder.is_done ? 'text-muted-foreground' : overdue ? 'text-destructive' : ''
                  }
                >
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/notes/${reminder.note_id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {noteTitle(reminder.note_id)}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {formatJalaliDateTime(reminder.remind_at)} · {relativeTime(reminder.remind_at)}
                  </p>
                </div>
                {reminder.is_done ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">انجام شد</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => void complete(reminder)}
                  >
                    <Check className="h-3.5 w-3.5" /> انجام شد
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
