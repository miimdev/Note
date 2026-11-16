'use client';

import * as React from 'react';
import { Copy, Globe, Link2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SharedNote } from '@/types/database.types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatJalaliDate } from '@/lib/jalali';

type Props = { noteId: string; userId: string; open: boolean; onOpenChange: (open: boolean) => void };

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'بدون انقضا' },
  { value: '1', label: '۱ روز' },
  { value: '7', label: '۷ روز' },
  { value: '30', label: '۳۰ روز' },
];

/** Creates / revokes read-only public links for a note. */
export function ShareDialog({ noteId, userId, open, onOpenChange }: Props) {
  const [shares, setShares] = React.useState<SharedNote[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [expiry, setExpiry] = React.useState('never');
  const [withPasswordless, setWithPasswordless] = React.useState(true);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);
    const client = getSupabaseBrowserClient();
    const { data } = await client
      .from('shared_notes')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });
    setShares((data ?? []) as SharedNote[]);
    setLoading(false);
  }, [noteId, open]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createShare = async () => {
    setCreating(true);
    try {
      const client = getSupabaseBrowserClient();
      const token = Array.from(crypto.getRandomValues(new Uint8Array(18)), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const expiresAt =
        expiry === 'never' ? null : new Date(Date.now() + Number(expiry) * 86_400_000).toISOString();

      const { data, error } = await client
        .from('shared_notes')
        .insert({ note_id: noteId, user_id: userId, token, expires_at: expiresAt })
        .select('*')
        .single();

      if (error) throw error;
      setShares([data as SharedNote, ...shares]);
      await navigator.clipboard.writeText(`${origin}/s/${token}`).catch(() => undefined);
      toast.success('لینک عمومی ساخته و کپی شد');
    } catch (error) {
      toast.error('ساخت لینک ناموفق بود', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (share: SharedNote) => {
    const client = getSupabaseBrowserClient();
    const { error } = await client.from('shared_notes').update({ is_active: false }).eq('id', share.id);
    if (error) {
      toast.error('لغو لینک ناموفق بود');
      return;
    }
    setShares(shares.map((item) => (item.id === share.id ? { ...item, is_active: false } : item)));
    toast.success('لینک غیرفعال شد');
  };

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(`${origin}/s/${token}`);
    toast.success('لینک کپی شد');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> اشتراک‌گذاری عمومی
          </DialogTitle>
          <DialogDescription>
            لینک عمومی فقط‌خواندنی است و هر زمان می‌توانید آن را غیرفعال کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiry">مدت اعتبار</Label>
            <select
              id="expiry"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-2.5">
            <div>
              <p className="text-sm">فقط‌خواندنی</p>
              <p className="text-[11px] text-muted-foreground">این گزینه همیشه فعال است (امنیت پیش‌فرض).</p>
            </div>
            <Switch checked={withPasswordless} disabled aria-label="فقط خواندنی" />
          </div>

          <Button onClick={() => void createShare()} disabled={creating} className="gap-1.5">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            ساخت لینک جدید
          </Button>

          <div className="flex flex-col gap-2">
            {loading && <p className="text-xs text-muted-foreground">در حال بارگذاری لینک‌ها…</p>}
            {!loading && shares.length === 0 && (
              <p className="text-xs text-muted-foreground">هنوز لینکی ساخته نشده است.</p>
            )}
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-2 rounded-md border p-2 text-xs"
                data-active={share.is_active}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px]" dir="ltr">
                    {origin}/s/{share.token}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {share.is_active ? 'فعال' : 'غیرفعال'}
                    {share.expires_at ? ` · تا ${formatJalaliDate(share.expires_at)}` : ' · بدون انقضا'}
                  </p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => void copy(share.token)} aria-label="کپی لینک">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {share.is_active && (
                  <Button size="icon-sm" variant="ghost" onClick={() => void revoke(share)} aria-label="لغو لینک">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
