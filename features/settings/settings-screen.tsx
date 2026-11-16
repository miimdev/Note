'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Keyboard,
  LogOut,
  MonitorSmartphone,
  Moon,
  Sun,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSync } from '@/features/sync/sync-provider';
import { useUiStore } from '@/store/ui-store';
import { useSyncStore } from '@/store/sync-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { resetLocalDatabase } from '@/lib/db/local-db';
import { exportAllAsZip } from '@/features/export/zip-export';
import { AI_ENABLED } from '@/features/ai/ai-actions';
import { requestNotificationPermission } from '@/features/reminders/notifications';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/jalali';

type ProfileRow = {
  display_name: string | null;
  locale: 'fa' | 'en';
  theme: 'light' | 'dark' | 'system';
  settings: Record<string, unknown>;
};

export function SettingsScreen() {
  const { user, signOut, userId, signedIn } = useSync();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const calendar = useUiStore((state) => state.calendar);
  const setCalendar = useUiStore((state) => state.setCalendar);
  const setShortcutsDialogOpen = useUiStore((state) => state.setShortcutsDialogOpen);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const pending = useSyncStore((state) => state.pending);
  const [displayName, setDisplayName] = React.useState('');
  const [locale, setLocale] = React.useState<'fa' | 'en'>('fa');
  const [saving, setSaving] = React.useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfileRow | null> => {
      const client = getSupabaseBrowserClient();
      const { data } = await client
        .from('profiles')
        .select('display_name, locale, theme, settings')
        .eq('user_id', userId!)
        .maybeSingle();
      return (data as ProfileRow) ?? null;
    },
  });

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setLocale(profile.locale);
    }
  }, [profile]);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const { error } = await client
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          locale,
          // Persist the preference itself ('system' included), not the resolved value.
          theme: (theme as 'light' | 'dark' | 'system') ?? 'system',
          settings: { calendar },
        })
        .eq('user_id', userId);
      if (error) throw error;
      document.cookie = `note-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
      toast.success('پروفایل ذخیره شد');
      if (locale !== profile?.locale) router.refresh();
    } catch (error) {
      toast.error('ذخیره ناموفق بود', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const wipeLocal = async () => {
    if (
      !window.confirm(
        'همه داده‌های محلی (آفلاین) پاک شود؟ داده‌های سرور دست‌نخورده می‌مانند و دوباره همگام می‌شوند.',
      )
    ) {
      return;
    }
    await resetLocalDatabase();
    toast.success('داده‌های محلی پاک شد', { description: 'صفحه بازخوانی می‌شود.' });
    setTimeout(() => window.location.reload(), 700);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">تنظیمات</h1>
        <p className="mt-1 text-sm text-muted-foreground">ظاهر، تقویم، حساب و داده‌های محلی.</p>
      </header>

      <section className="surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <UserRound className="h-4 w-4" /> حساب
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              value={user?.email ?? ''}
              readOnly
              dir="ltr"
              className="bg-muted/50"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">نام نمایشی</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="locale">زبان رابط</Label>
              <select
                id="locale"
                value={locale}
                onChange={(event) => setLocale(event.target.value as 'fa' | 'en')}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="fa">فارسی</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <Button
            onClick={() => void saveProfile()}
            disabled={saving || !signedIn}
            className="w-fit"
          >
            ذخیره پروفایل
          </Button>
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <MonitorSmartphone className="h-4 w-4" /> ظاهر
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'light', label: 'روشن', icon: Sun },
            { id: 'dark', label: 'تاریک', icon: Moon },
            { id: 'system', label: 'خودکار', icon: MonitorSmartphone },
          ].map((option) => {
            const Icon = option.icon;
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                  active ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4" /> {option.label}
              </button>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm">تقویم پیش‌فرض</p>
            <p className="text-xs text-muted-foreground">تاریخ‌ها در فهرست و یادداشت روزانه.</p>
          </div>
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
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm">جهت خودکار هر بلاک</p>
            <p className="text-xs text-muted-foreground">
              جهت متن بر اساس زبان همان بلاک تعیین می‌شود.
            </p>
          </div>
          <Switch checked disabled aria-label="RTL خودکار" />
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Download className="h-4 w-4" /> داده و پشتیبان
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          آخرین همگام‌سازی: {lastSyncedAt ? relativeTime(lastSyncedAt) : '—'}
          {pending > 0 ? ` · ${pending} مورد در صف` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportAllAsZip()} className="gap-1.5">
            <Download className="h-4 w-4" /> خروجی zip
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => void requestNotificationPermission()}
          >
            فعال‌سازی اعلان مرورگر
          </Button>
          <Button
            variant="outline"
            className="gap-1.5 text-destructive"
            onClick={() => void wipeLocal()}
          >
            <Trash2 className="h-4 w-4" /> پاک‌سازی داده محلی
          </Button>
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Keyboard className="h-4 w-4" /> میانبرها و دستیار
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShortcutsDialogOpen(true)}>
            راهنمای میانبرها
          </Button>
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            دستیار هوشمند: {AI_ENABLED ? 'فعال' : 'خاموش (feature flag)'}
          </span>
        </div>
      </section>

      <section className="surface p-4">
        <Button
          variant="outline"
          className="gap-1.5 text-destructive"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4" /> خروج از حساب
        </Button>
      </section>
    </div>
  );
}
