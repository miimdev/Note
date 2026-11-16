'use client';

import { useEditorState, type Editor } from '@tiptap/react';
import { CloudOff, Check, Loader2, AlertCircle, PenLine } from 'lucide-react';
import type { SaveStatus } from '@/types/domain';
import { cn } from '@/lib/utils';
import { countCharacters, countWords, readingTimeMinutes } from '@/lib/editor/content';
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

/**
 * Live word/character/reading-time counters plus the save indicator.
 * `useEditorState` makes the component re-render on every edit, which the plain
 * `editor.getText()` used to miss (the counters stayed frozen while typing).
 */
export function DocStats({ editor, saveStatus }: { editor: Editor; saveStatus: SaveStatus }) {
  const meta = STATUS_META[saveStatus];
  const Icon = meta.icon;

  const stats = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const text = instance.getText();
      const words = countWords(text);
      return {
        words,
        chars: countCharacters(text),
        minutes: readingTimeMinutes(words, 'fa'),
      };
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{toPersianDigits(stats?.words ?? 0)} کلمه</span>
        <span aria-hidden>·</span>
        <span>{toPersianDigits(stats?.chars ?? 0)} کاراکتر</span>
        <span aria-hidden>·</span>
        <span>{toPersianDigits(stats?.minutes ?? 0)} دقیقه مطالعه</span>
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
