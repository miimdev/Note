'use client';

import { useEditorState, type Editor } from '@tiptap/react';
import { countCharacters, countWords, readingTimeMinutes } from '@/lib/editor/content';
import { toPersianDigits } from '@/lib/jalali';

/**
 * Floating live counters for the focus mode (word count + reading time),
 * kept separate from the toolbar so the editor surface stays calm.
 */
export function EditorStats({ editor }: { editor: Editor }) {
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

  const words = stats?.words ?? 0;
  const chars = stats?.chars ?? 0;
  const minutes = stats?.minutes ?? 0;

  return (
    <div
      className="no-print flex flex-wrap gap-3 text-[11px] text-muted-foreground/80"
      aria-live="off"
    >
      <span>{toPersianDigits(words)} کلمه</span>
      <span>{toPersianDigits(chars)} کاراکتر</span>
      <span>~{toPersianDigits(minutes)} دقیقه</span>
    </div>
  );
}
