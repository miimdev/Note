'use client';

import type { Editor } from '@tiptap/react';
import { CloudOff, Check, Loader2, AlertCircle, PenLine } from 'lucide-react';
import type { SaveStatus } from '@/types/domain';
import { cn } from '@/lib/utils';
import { countWords, readingTimeMinutes } from '@/lib/editor/content';
import { toPersianDigits } from '@/lib/jalali';

const STATUS_META: Record<
  SaveStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  idle: { label: 'آماده', icon: PenLine, className: 'text-muted-foreground' },
  dirty: { label: 'در حال ذخیره…', icon: PenLine, className: 'text-amber-600 dark:text-amber-400' },
  saving: {
    label: 'در حال ذخیره…',
    icon: Loader2,
    className: 'text-amber-600 dark:text-amber-400',
  },
  saved: { label: 'ذخیره شد', icon: Check, className: 'text-emerald-600 dark:text-emerald-400' },
  offline: { label: 'آفلاین — در صف', icon: CloudOff, className: 'text-sky-600 dark:text-sky-400' },
  error: { label: 'خطا در ذخیره', icon: AlertCircle, className: 'text-destructive' },
  conflict: { label: 'تداخل نسخه', icon: AlertCircle, className: 'text-destructive' },
};

export function DocStats({ editor, saveStatus }: { editor: Editor; saveStatus: SaveStatus }) {
  const meta = STATUS_META[saveStatus];
  const Icon = meta.icon;
  const text = editor.getText();
  const words = countWords(text);
  const minutes = readingTimeMinutes(words, 'fa');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{toPersianDigits(words)} کلمه</span>
        <span aria-hidden>·</span>
        <span>{toPersianDigits(minutes)} دقیقه مطالعه</span>
      </div>
      <div
        className={cn('flex items-center gap-1.5', meta.className)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Icon className={cn('h-3.5 w-3.5', saveStatus === 'saving' && 'animate-spin')} />
        <span>{meta.label}</span>
      </div>
    </div>
  );
}
