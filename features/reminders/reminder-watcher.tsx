'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getDb } from '@/lib/db/local-db';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSync } from '@/features/sync/sync-provider';
import { useNotesStore } from '@/store/notes-store';
import { showLocalNotification } from './notifications';

const CHECK_INTERVAL = 30_000;

/**
 * Polls local reminders (kept in IndexedDB by the sync engine) and fires a
 * browser notification + in-app toast when one becomes due. Marks it as done so
 * it never fires twice.
 */
export function ReminderWatcher() {
  const { userId } = useSync();
  const notes = useNotesStore((state) => state.notes);
  const router = useRouter();

  React.useEffect(() => {
    if (!userId) return;
    const fired = new Set<string>();

    const check = async () => {
      const db = getDb();
      const now = Date.now();
      const due = (await db.reminders.toArray()).filter(
        (reminder) =>
          !reminder.is_done && !reminder.fired_at && new Date(reminder.remind_at).getTime() <= now,
      );

      for (const reminder of due) {
        if (fired.has(reminder.id)) continue;
        fired.add(reminder.id);

        const note = notes.find((item) => item.id === reminder.note_id);
        const title = note?.title || 'یادآور یادداشت';

        await showLocalNotification(
          title,
          'زمان یادآوری این یادداشت رسید.',
          `/notes/${reminder.note_id}`,
        );
        toast(title, {
          description: 'زمان یادآوری رسید',
          action: { label: 'بازکردن', onClick: () => router.push(`/notes/${reminder.note_id}`) },
        });

        await db.reminders.update(reminder.id, {
          is_done: true,
          fired_at: new Date().toISOString(),
        });
        const client = getSupabaseBrowserClient();
        await client
          .from('reminders')
          .update({ is_done: true, fired_at: new Date().toISOString() })
          .eq('id', reminder.id);
      }
    };

    void check();
    const interval = setInterval(() => void check(), CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [notes, router, userId]);

  return null;
}
