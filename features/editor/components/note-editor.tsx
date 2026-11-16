'use client';

import * as React from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { NoteContent } from '@/types/database.types';
import { buildExtensions } from '../extensions';
import { EditorBubbleMenu } from './editor-bubble-menu';
import { EditorToolbar } from './editor-toolbar';
import { EditorStats } from './editor-stats';
import { useAutosave } from '../use-autosave';
import { DocStats } from './doc-stats';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';
import { docToText } from '@/lib/editor/content';
import { useOnline } from '@/hooks/use-online';
import { SlashImageDialog } from './slash-image-dialog';

export type NoteEditorProps = {
  noteId: string;
  userId: string;
  initialTitle: string;
  initialContent: NoteContent;
  onOpenWikiLink?: (title: string) => void;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
};

export function NoteEditor({
  noteId,
  userId,
  initialTitle,
  initialContent,
  onOpenWikiLink,
  readOnly = false,
  compact = false,
  className,
}: NoteEditorProps) {
  const [title, setTitle] = React.useState(initialTitle);
  const [imageDialog, setImageDialog] = React.useState<{ editor: Editor; range: { from: number; to: number } } | null>(
    null,
  );
  const autosave = useAutosave({ noteId, userId });
  const fontSize = useUiStore((state) => state.editorFontSize);
  const focusMode = useUiStore((state) => state.focusMode);
  const online = useOnline();

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: buildExtensions({
      onOpenWikiLink,
      slash: {
        onImageRequest: (nextEditor, range) => setImageDialog({ editor: nextEditor, range }),
      },
    }),
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          'prose-editor focus:outline-none',
          fontSize === 'sm' && 'text-[14px]',
          fontSize === 'lg' && 'text-[17px]',
        ),
        'aria-label': 'محتوای یادداشت',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: instance }) => {
      autosave.save({
        title,
        content: instance.getJSON() as NoteContent,
      });
    },
  });

  const lastTitle = React.useRef(title);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    lastTitle.current = value;
    if (editor) {
      autosave.save({ title: value, content: editor.getJSON() as NoteContent });
    }
  };

  // Ctrl/Cmd+S forces an immediate flush.
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void autosave.saveNow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [autosave]);

  if (!editor) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />;
  }

  return (
    <div className={cn('flex flex-col gap-3', className)} data-online={online}>
      {!readOnly && (
        <div className={cn(focusMode ? 'hidden' : 'block')}>
          <EditorToolbar editor={editor} />
        </div>
      )}

      <input
        value={title}
        onChange={(event) => handleTitleChange(event.target.value)}
        placeholder="عنوان یادداشت"
        aria-label="عنوان یادداشت"
        readOnly={readOnly}
        className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 focus:ring-0"
      />

      {!readOnly && (
        <BubbleMenu editor={editor} options={{ placement: 'top' }}>
          <EditorBubbleMenu editor={editor} />
        </BubbleMenu>
      )}

      <EditorContent editor={editor} className={cn('ProseMirror-host', compact && 'max-h-[50vh] overflow-y-auto')} />

      <DocStats editor={editor} saveStatus={autosave.status} />

      <SlashImageDialog
        editor={imageDialog?.editor ?? editor}
        range={imageDialog?.range ?? null}
        onClose={() => setImageDialog(null)}
        noteId={noteId}
        userId={userId}
      />

      <EditorStats text={editor ? docToText(editor.getJSON() as NoteContent) : ''} />
    </div>
  );
}
