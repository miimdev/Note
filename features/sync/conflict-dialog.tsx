'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNotesStore } from '@/store/notes-store';
import { useSync } from './sync-provider';
import { docToText } from '@/lib/editor/content';
import { relativeTime } from '@/lib/jalali';

export function ConflictDialog() {
  const conflict = useNotesStore((state) => state.conflict);
  const setConflict = useNotesStore((state) => state.setConflict);
  const { engine } = useSync();
  const [busy, setBusy] = React.useState(false);

  const resolve = async (choice: 'local' | 'remote') => {
    if (!conflict || !engine) return;
    setBusy(true);
    try {
      await engine.resolveConflict(conflict.noteId, choice);
      setConflict(null);
    } finally {
      setBusy(false);
    }
  };

  if (!conflict) return null;

  const localPreview = docToText(conflict.local.content).slice(0, 220);
  const remotePreview = docToText(conflict.remote.content).slice(0, 220);

  return (
    <Dialog open onOpenChange={(open) => !open && setConflict(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            تداخل نسخه
          </DialogTitle>
          <DialogDescription>
            این یادداشت هم روی این دستگاه و هم روی دستگاه دیگری تغییر کرده است. کدام نسخه را نگه
            داریم؟
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-lg border p-3">
            <h3 className="mb-1 flex items-center justify-between text-sm font-medium">
              نسخه این دستگاه
              <span className="text-[11px] font-normal text-muted-foreground">
                {relativeTime(conflict.local.updated_at)}
              </span>
            </h3>
            <p className="mb-2 truncate text-xs text-muted-foreground">
              {conflict.local.title || 'بدون عنوان'}
            </p>
            <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-5">
              {localPreview || '—'}
            </p>
            <Button
              className="mt-3 w-full"
              size="sm"
              disabled={busy}
              onClick={() => void resolve('local')}
            >
              نگه‌داشتن نسخه من
            </Button>
          </section>

          <section className="rounded-lg border p-3">
            <h3 className="mb-1 flex items-center justify-between text-sm font-medium">
              نسخه سرور
              <span className="text-[11px] font-normal text-muted-foreground">
                {relativeTime(conflict.remote.updated_at)}
              </span>
            </h3>
            <p className="mb-2 truncate text-xs text-muted-foreground">
              {conflict.remote.title || 'بدون عنوان'}
            </p>
            <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-5">
              {remotePreview || '—'}
            </p>
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void resolve('remote')}
            >
              استفاده از نسخه سرور
            </Button>
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setConflict(null)} disabled={busy}>
            بعداً تصمیم می‌گیرم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
