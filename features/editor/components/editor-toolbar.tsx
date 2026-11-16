'use client';

import { useEditorState, type Editor } from '@tiptap/react';
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

/**
 * The toolbar is a sibling of the editor content, so it does not re-render when
 * the document changes on its own. `useEditorState` subscribes it to the editor
 * so the active/disabled flags always reflect the cursor position.
 */
function useToolbarState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      underline: instance.isActive('underline'),
      strike: instance.isActive('strike'),
      h1: instance.isActive('heading', { level: 1 }),
      h2: instance.isActive('heading', { level: 2 }),
      h3: instance.isActive('heading', { level: 3 }),
      bulletList: instance.isActive('bulletList'),
      orderedList: instance.isActive('orderedList'),
      taskList: instance.isActive('taskList'),
      blockquote: instance.isActive('blockquote'),
      codeBlock: instance.isActive('codeBlock'),
      table: instance.isActive('table'),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useToolbarState(editor);
  const chain = () => editor.chain().focus();

  const groups: ToolbarAction[][] = [
    [
      {
        label: 'واگرد',
        icon: Undo2,
        disabled: !state?.canUndo,
        onClick: () => chain().undo().run(),
      },
      {
        label: 'ازنو',
        icon: Redo2,
        disabled: !state?.canRedo,
        onClick: () => chain().redo().run(),
      },
    ],
    [
      {
        label: 'تیتر ۱',
        icon: Heading1,
        active: state?.h1,
        onClick: () => chain().toggleHeading({ level: 1 }).run(),
      },
      {
        label: 'تیتر ۲',
        icon: Heading2,
        active: state?.h2,
        onClick: () => chain().toggleHeading({ level: 2 }).run(),
      },
      {
        label: 'تیتر ۳',
        icon: Heading3,
        active: state?.h3,
        onClick: () => chain().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        label: 'ضخیم',
        icon: Bold,
        active: state?.bold,
        onClick: () => chain().toggleBold().run(),
      },
      {
        label: 'کج',
        icon: Italic,
        active: state?.italic,
        onClick: () => chain().toggleItalic().run(),
      },
      {
        label: 'زیرخط',
        icon: UnderlineIcon,
        active: state?.underline,
        onClick: () => chain().toggleUnderline().run(),
      },
      {
        label: 'خط‌خورده',
        icon: Strikethrough,
        active: state?.strike,
        onClick: () => chain().toggleStrike().run(),
      },
    ],
    [
      {
        label: 'لیست',
        icon: List,
        active: state?.bulletList,
        onClick: () => chain().toggleBulletList().run(),
      },
      {
        label: 'لیست شماره‌دار',
        icon: ListOrdered,
        active: state?.orderedList,
        onClick: () => chain().toggleOrderedList().run(),
      },
      {
        label: 'چک‌لیست',
        icon: CheckSquare,
        active: state?.taskList,
        onClick: () => chain().toggleTaskList().run(),
      },
    ],
    [
      {
        label: 'نقل‌قول',
        icon: Quote,
        active: state?.blockquote,
        onClick: () => chain().toggleBlockquote().run(),
      },
      {
        label: 'بلوک کد',
        icon: Code2,
        active: state?.codeBlock,
        onClick: () => chain().toggleCodeBlock().run(),
      },
      {
        label: 'جدول',
        icon: TableIcon,
        active: state?.table,
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
        <div
          key={groupIndex}
          className="flex items-center gap-0.5 border-e pe-1 last:border-e-0 last:pe-0"
        >
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
