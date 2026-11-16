'use client';

import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import UniqueID from '@tiptap/extension-unique-id';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import type { Extensions } from '@tiptap/core';
import { SlashCommand, type SlashCommandOptions } from './slash-command';
import { AutoDirection, WikiLink } from './wiki-link';

export const lowlight = createLowlight(common);

export type BuildExtensionsOptions = {
  placeholder?: string;
  slash?: SlashCommandOptions;
  onOpenWikiLink?: (title: string) => void;
  editable?: boolean;
};

export function buildExtensions(options: BuildExtensionsOptions = {}): Extensions {
  const { placeholder = 'برای شروع بنویسید، یا با «/» یک بلاک اضافه کنید…', slash, onOpenWikiLink } = options;

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      link: false,
      underline: false,
      dropcursor: { color: 'hsl(var(--primary))', width: 2 },
    }),
    Underline,
    Highlight.configure({ multicolor: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true, allowTableNodeSelection: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'rounded-lg' } }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      protocols: ['http', 'https', 'mailto'],
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Typography,
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
    Placeholder.configure({ placeholder, includeChildren: true }),
    CharacterCount,
    UniqueID.configure({ types: ['paragraph', 'heading', 'blockquote', 'listItem', 'taskItem', 'codeBlock'] }),
    WikiLink.configure({ onOpen: onOpenWikiLink }),
    AutoDirection,
    SlashCommand.configure(slash ?? {}),
  ];
}
