'use client';

import * as React from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestNotificationPermission, showLocalNotification } from './notifications';

type Props = { noteId: string; noteTitle: string; open: boolean; onOpenChange: (open: boolean) => void };

function defaultDateTime(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ReminderDialog({ noteId, noteTitle, open, onOpenChange }: Props) {
  const [when, setWhen] = React.useState(defaultDateTime());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setWhen(defaultDateTime());
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const remindAt = new Date(when);
      if (Number.isNaN(remindAt.getTime())) throw new Error('زمان معتبر نیست');

      const { error } = await client.from('reminders').insert({
        note_id: noteId,
        remind_at: remindAt.toISOString(),
        channel: 'browser',
      });
      if (error) throw error;

      const granted = await requestNotificationPermission();
      if (granted) {
        toast.success('یادآور ثبت شد', { description: 'اعلان مرورگر فعال است.' });
      } else {
        toast.success('یادآور ثبت شد', { description: 'اعلان مرورگر غیرفعال است؛ داخل برنامه نمایش داده می‌شود.' });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('ثبت یادآور ناموفق بود', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> یادآور
            </DialogTitle>
            <DialogDescription>{noteTitle || 'این یادداشت'}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remind-at">زمان یادآوری</Label>
            <Input
              id="remind-at"
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              required
              dir="ltr"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { label: '۱ ساعت بعد', ms: 3600_000 },
              { label: 'فردا صبح', ms: 16 * 3600_000 },
              { label: 'هفته آینده', ms: 7 * 86_400_000 },
            ].map((preset) => (
              <Button
                key={preset.label}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => {
                  const date = new Date(Date.now() + preset.ms);
                  const offset = date.getTimezoneOffset() * 60_000;
                  setWhen(new Date(date.getTime() - offset).toISOString().slice(0, 16));
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} ثبت
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { showLocalNotification };
