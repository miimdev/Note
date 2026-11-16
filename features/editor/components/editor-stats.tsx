'use client';

import * as React from 'react';
import { countCharacters, countWords, readingTimeMinutes } from '@/lib/editor/content';
import { toPersianDigits } from '@/lib/jalali';

/**
 * Floating live counters for the focus mode (word count + reading time),
 * kept separate from the toolbar so the editor surface stays calm.
 */
export function EditorStats({ text }: { text: string }) {
  const words = React.useMemo(() => countWords(text), [text]);
  const chars = React.useMemo(() => countCharacters(text), [text]);
  const minutes = readingTimeMinutes(words, 'fa');

  return (
    <div className="no-print flex flex-wrap gap-3 text-[11px] text-muted-foreground/80" aria-live="off">
      <span>{toPersianDigits(words)} کلمه</span>
      <span>{toPersianDigits(chars)} کاراکتر</span>
      <span>~{toPersianDigits(minutes)} دقیقه</span>
    </div>
  );
}
