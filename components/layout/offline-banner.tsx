'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { useOnline } from '@/hooks/use-online';
import { useSyncStore } from '@/store/sync-store';
import { useSync } from '@/features/sync/sync-provider';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const online = useOnline();
  const pending = useSyncStore((state) => state.pending);
  const { engine } = useSync();

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print flex items-center justify-between gap-2 border-b bg-amber-50 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <span className="flex items-center gap-1.5">
        <CloudOff className="h-3.5 w-3.5" />
        {online
          ? `${pending} تغییر در انتظار همگام‌سازی است`
          : 'آفلاین هستید — تغییرات ذخیره می‌شوند و بعد از اتصال همگام می‌شوند'}
      </span>
      {online && pending > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-xs"
          onClick={() => void engine?.sync()}
        >
          <RefreshCw className="h-3 w-3" /> همگام‌سازی
        </Button>
      )}
    </div>
  );
}
