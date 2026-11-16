'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Undo2,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ToolbarAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function EditorToolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();

  const groups: ToolbarAction[][] = [
    [
      {
        label: 'واگرد',
        icon: Undo2,
        disabled: !editor.can().undo(),
        onClick: () => chain().undo().run(),
      },
      {
        label: 'ازنو',
        icon: Redo2,
        disabled: !editor.can().redo(),
        onClick: () => chain().redo().run(),
      },
    ],
    [
      {
        label: 'تیتر ۱',
        icon: Heading1,
        active: editor.isActive('heading', { level: 1 }),
        onClick: () => chain().toggleHeading({ level: 1 }).run(),
      },
      {
        label: 'تیتر ۲',
        icon: Heading2,
        active: editor.isActive('heading', { level: 2 }),
        onClick: () => chain().toggleHeading({ level: 2 }).run(),
      },
      {
        label: 'تیتر ۳',
        icon: Heading3,
        active: editor.isActive('heading', { level: 3 }),
        onClick: () => chain().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      { label: 'ضخیم', icon: Bold, active: editor.isActive('bold'), onClick: () => chain().toggleBold().run() },
      { label: 'کج', icon: Italic, active: editor.isActive('italic'), onClick: () => chain().toggleItalic().run() },
      {
        label: 'زیرخط',
        icon: UnderlineIcon,
        active: editor.isActive('underline'),
        onClick: () => chain().toggleUnderline().run(),
      },
      {
        label: 'خط‌خورده',
        icon: Strikethrough,
        active: editor.isActive('strike'),
        onClick: () => chain().toggleStrike().run(),
      },
    ],
    [
      {
        label: 'لیست',
        icon: List,
        active: editor.isActive('bulletList'),
        onClick: () => chain().toggleBulletList().run(),
      },
      {
        label: 'لیست شماره‌دار',
        icon: ListOrdered,
        active: editor.isActive('orderedList'),
        onClick: () => chain().toggleOrderedList().run(),
      },
      {
        label: 'چک‌لیست',
        icon: CheckSquare,
        active: editor.isActive('taskList'),
        onClick: () => chain().toggleTaskList().run(),
      },
    ],
    [
      {
        label: 'نقل‌قول',
        icon: Quote,
        active: editor.isActive('blockquote'),
        onClick: () => chain().toggleBlockquote().run(),
      },
      {
        label: 'بلوک کد',
        icon: Code2,
        active: editor.isActive('codeBlock'),
        onClick: () => chain().toggleCodeBlock().run(),
      },
      {
        label: 'جدول',
        icon: TableIcon,
        active: editor.isActive('table'),
        onClick: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ],
  ];

  return (
    <div
      role="toolbar"
      aria-label="ابزار قالب‌بندی"
      className="no-print flex flex-wrap items-center gap-1 rounded-lg border bg-card/60 p-1"
    >
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="flex items-center gap-0.5 border-e pe-1 last:border-e-0 last:pe-0">
          {group.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                title={action.label}
                aria-label={action.label}
                aria-pressed={action.active}
                disabled={action.disabled}
                onClick={action.onClick}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40',
                  action.active && 'bg-accent text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
