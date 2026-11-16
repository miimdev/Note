'use client';

import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Smile,
  Table as TableIcon,
  Type,
} from 'lucide-react';
import { SlashMenu, type SlashMenuItem, type SlashMenuRef } from '../components/slash-menu';

export type SlashCommandItem = SlashMenuItem;

const ITEMS: SlashCommandItem[] = [
  {
    title: 'متن',
    subtitle: 'پاراگراف ساده',
    keywords: ['paragraph', 'text', 'متن', 'پاراگراف'],
    icon: Type,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'تیتر ۱',
    subtitle: 'عنوان بزرگ',
    keywords: ['h1', 'heading', 'تیتر', 'سرتیتر'],
    icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'تیتر ۲',
    subtitle: 'عنوان میانی',
    keywords: ['h2', 'heading', 'تیتر'],
    icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'تیتر ۳',
    subtitle: 'عنوان کوچک',
    keywords: ['h3', 'heading', 'تیتر'],
    icon: Heading3,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'لیست نقطه‌ای',
    subtitle: 'لیست بدون ترتیب',
    keywords: ['bullet', 'list', 'لیست'],
    icon: List,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'لیست شماره‌دار',
    subtitle: 'لیست مرتب',
    keywords: ['ordered', 'number', 'شماره'],
    icon: ListOrdered,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'چک‌لیست',
    subtitle: 'کارها با تیک',
    keywords: ['todo', 'task', 'چک', 'کار'],
    icon: CheckSquare,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'نقل‌قول',
    subtitle: 'متن برجسته',
    keywords: ['quote', 'blockquote', 'نقل'],
    icon: Quote,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'بلوک کد',
    subtitle: 'با رنگ‌بندی سینتکس',
    keywords: ['code', 'codeblock', 'کد'],
    icon: Code2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'جدول',
    subtitle: '۳ در ۳ با سرسطر',
    keywords: ['table', 'جدول'],
    icon: TableIcon,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: 'جداکننده',
    subtitle: 'خط افقی',
    keywords: ['hr', 'divider', 'خط'],
    icon: Minus,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'تصویر',
    subtitle: 'افزودن تصویر',
    keywords: ['image', 'photo', 'عکس', 'تصویر'],
    icon: ImageIcon,
    command: ({ editor, range }) => {
      const url = window.prompt('آدرس تصویر (https://…)');
      if (!url) return;
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    },
  },
  {
    title: 'فایل',
    subtitle: 'پیوست با لینک',
    keywords: ['file', 'attachment', 'فایل', 'پیوست'],
    icon: Paperclip,
    command: ({ editor, range }) => {
      const url = window.prompt('آدرس فایل (https://…)');
      if (!url) return;
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`,
        )
        .run();
    },
  },
  {
    title: 'ایموجی',
    subtitle: 'افزودن ایموجی',
    keywords: ['emoji', 'ایموجی'],
    icon: Smile,
    command: ({ editor, range }) => {
      const emoji = window.prompt('ایموجی را بچسبانید');
      if (!emoji) return;
      editor.chain().focus().deleteRange(range).insertContent(emoji).run();
    },
  },
];

export function filterSlashItems(query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return ITEMS;
  return ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.keywords.some((keyword) => keyword.includes(q)),
  );
}

export type SlashCommandOptions = {
  onImageRequest?: (editor: Editor, range: Range) => void;
  onFileRequest?: (editor: Editor, range: Range) => void;
};

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onImageRequest: undefined, onFileRequest: undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    const suggestion: Omit<SuggestionOptions<SlashCommandItem>, 'editor'> = {
      char: '/',
      allowSpaces: false,
      startOfLine: false,
      items: ({ query }) => filterSlashItems(query),
      command: ({ editor, range, props }) => {
        if (props.title === 'تصویر' && options.onImageRequest) {
          options.onImageRequest(editor, range);
          return;
        }
        if (props.title === 'فایل' && options.onFileRequest) {
          options.onFileRequest(editor, range);
          return;
        }
        props.command({ editor, range });
      },
      render: () => {
        let component: ReactRenderer<SlashMenuRef> | null = null;
        let unmount: (() => void) | null = null;

        const teardown = () => {
          unmount?.();
          unmount = null;
          component?.destroy();
          component = null;
        };

        return {
          onStart: (props) => {
            component = new ReactRenderer(SlashMenu, {
              props: { items: props.items, command: props.command, query: props.query },
              editor: props.editor,
            });
            // `mount` attaches the element to the page and keeps it anchored to
            // the caret (ReactRenderer alone renders into a detached node).
            unmount = props.mount(component.element);
          },
          onUpdate: (props) => {
            component?.updateProps({
              items: props.items,
              command: props.command,
              query: props.query,
            });
          },
          onKeyDown: (props) => {
            if (props.event.key === 'Escape') {
              teardown();
              return true;
            }
            return component?.ref?.onKeyDown(props.event) ?? false;
          },
          onExit: () => {
            teardown();
          },
        };
      },
    };

    return [Suggestion({ editor: this.editor, ...suggestion })];
  },
});
