'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { CommandPalette } from '@/features/command-palette/command-palette';
import { ShortcutsDialog } from '@/features/command-palette/shortcuts-dialog';
import { GlobalHotkeys } from './global-hotkeys';
import { SyncStatusBar } from '@/features/sync/sync-status-bar';
import { ConflictDialog } from '@/features/sync/conflict-dialog';
import { ReminderWatcher } from '@/features/reminders/reminder-watcher';
import { OfflineBanner } from './offline-banner';
import { useUiStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const focusMode = useUiStore((state) => state.focusMode);
  const pathname = usePathname();
  const isEditor = /^\/notes\/[^/]+$/.test(pathname);

  return (
    <div className={cn('flex min-h-dvh', focusMode && 'focus-mode')}>
      <div className={cn(focusMode ? 'hidden' : 'hidden md:block')}>
        <Sidebar />
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <div className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">{children}</div>
        <SyncStatusBar />
      </main>

      {!focusMode && !isEditor && <MobileNav />}

      <CommandPalette />
      <ShortcutsDialog />
      <GlobalHotkeys />
      <ConflictDialog />
      <ReminderWatcher />
    </div>
  );
}
