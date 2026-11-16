'use client';

import { useEditorState, type Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link2,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();

  // Subscribe so the pressed state follows the selection inside the bubble.
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      underline: instance.isActive('underline'),
      strike: instance.isActive('strike'),
      highlight: instance.isActive('highlight'),
      code: instance.isActive('code'),
      link: instance.isActive('link'),
    }),
  });

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('آدرس لینک', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      chain().extendMarkRange('link').unsetLink().run();
      return;
    }
    chain().extendMarkRange('link').setLink({ href: url }).run();
  };

  const buttons = [
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
    {
      label: 'هایلایت',
      icon: Highlighter,
      active: state?.highlight,
      onClick: () => chain().toggleHighlight().run(),
    },
    {
      label: 'کد',
      icon: Code,
      active: state?.code,
      onClick: () => chain().toggleCode().run(),
    },
    {
      label: 'لینک',
      icon: Link2,
      active: state?.link,
      onClick: setLink,
    },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0">
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <button
            key={button.label}
            type="button"
            aria-label={button.label}
            aria-pressed={button.active}
            title={button.label}
            onClick={button.onClick}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              button.active && 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
