'use client';

import { Check, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useSyncStore } from '@/store/sync-store';
import { useSync } from './sync-provider';
import { relativeTime } from '@/lib/jalali';
import { cn } from '@/lib/utils';

export function SyncStatusBar() {
  const { syncing, pending, lastSyncedAt, online, lastError } = useSyncStore();
  const { engine } = useSync();

  const label = !online
    ? 'آفلاین'
    : syncing
      ? 'همگام‌سازی…'
      : pending > 0
        ? `${pending} مورد در صف`
        : lastSyncedAt
          ? `همگام شد · ${relativeTime(lastSyncedAt)}`
          : 'آماده';

  return (
    <div className="no-print pointer-events-none fixed bottom-2 start-2 z-30 hidden md:block">
      <button
        type="button"
        onClick={() => void engine?.sync()}
        title={lastError ?? 'همگام‌سازی دستی'}
        className={cn(
          'pointer-events-auto flex items-center gap-1.5 rounded-full border bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground',
          !online && 'text-amber-600',
          lastError && online && 'text-destructive',
        )}
      >
        {!online ? (
          <CloudOff className="h-3 w-3" />
        ) : syncing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : pending > 0 ? (
          <RefreshCw className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3 text-emerald-600" />
        )}
        {label}
      </button>
    </div>
  );
}
