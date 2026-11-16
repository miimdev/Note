'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Archive,
  CalendarDays,
  CheckSquare,
  FileText,
  Globe,
  Keyboard,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUiStore } from '@/store/ui-store';
import { useNotesStore } from '@/store/notes-store';
import { useNoteActions } from '@/features/notes/use-note-actions';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/jalali';

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void | Promise<void>;
  group: 'یادداشت' | 'پیمایش' | 'نمایش' | 'جستجو';
};

export function CommandPalette() {
  const open = useUiStore((state) => state.commandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const setShortcutsOpen = useUiStore((state) => state.setShortcutsDialogOpen);
  const toggleFocusMode = useUiStore((state) => state.toggleFocusMode);
  const notes = useNotesStore((state) => state.notes);
  const { createNote } = useNoteActions();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands = React.useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: 'new',
        label: 'یادداشت جدید',
        hint: '⌘N',
        icon: Plus,
        group: 'یادداشت',
        run: async () => {
          const id = await createNote({});
          if (id) router.push(`/notes/${id}`);
        },
      },
      {
        id: 'daily',
        label: 'یادداشت روزانه',
        hint: '⌘⇧D',
        icon: CalendarDays,
        group: 'یادداشت',
        run: () => router.push('/daily'),
      },
      {
        id: 'templates',
        label: 'قالب‌ها',
        icon: LayoutGrid,
        group: 'یادداشت',
        run: () => router.push('/templates'),
      },
      { id: 'all', label: 'همه یادداشت‌ها', icon: FileText, group: 'پیمایش', run: () => router.push('/notes') },
      { id: 'favorites', label: 'علاقه‌مندی‌ها', icon: Star, group: 'پیمایش', run: () => router.push('/favorites') },
      { id: 'graph', label: 'شبکه دانش', icon: Globe, group: 'پیمایش', run: () => router.push('/graph') },
      { id: 'archive', label: 'آرشیو', icon: Archive, group: 'پیمایش', run: () => router.push('/archive') },
      { id: 'trash', label: 'سطل زباله', icon: Trash2, group: 'پیمایش', run: () => router.push('/trash') },
      { id: 'settings', label: 'تنظیمات', icon: Settings, group: 'پیمایش', run: () => router.push('/settings') },
      {
        id: 'search-page',
        label: 'جستجوی پیشرفته',
        icon: Search,
        group: 'جستجو',
        run: () => router.push('/search'),
      },
      {
        id: 'theme',
        label: resolvedTheme === 'dark' ? 'تم روشن' : 'تم تاریک',
        icon: resolvedTheme === 'dark' ? Sun : Moon,
        group: 'نمایش',
        run: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'focus',
        label: 'حالت تمرکز',
        hint: '⌘⇧F',
        icon: CheckSquare,
        group: 'نمایش',
        run: () => toggleFocusMode(),
      },
      {
        id: 'shortcuts',
        label: 'راهنمای میانبرها',
        hint: '?',
        icon: Keyboard,
        group: 'نمایش',
        run: () => setShortcutsOpen(true),
      },
    ];
    return list;
  }, [createNote, resolvedTheme, router, setShortcutsOpen, setTheme, toggleFocusMode]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedCommands = q
      ? commands.filter((command) => command.label.toLowerCase().includes(q))
      : commands;

    const matchedNotes = q
      ? notes
          .filter((note) => !note.deleted_at && note.title.toLowerCase().includes(q))
          .slice(0, 6)
          .map<Command>((note) => ({
            id: `note-${note.id}`,
            label: note.title || 'بدون عنوان',
            hint: note.content_text.slice(0, 40),
            icon: FileText,
            group: 'جستجو',
            run: () => router.push(`/notes/${note.id}`),
          }))
      : notes
          .filter((note) => !note.deleted_at)
          .slice(0, 5)
          .map<Command>((note) => ({
            id: `note-${note.id}`,
            label: note.title || 'بدون عنوان',
            hint: 'یادداشت اخیر',
            icon: FileText,
            group: 'یادداشت',
            run: () => router.push(`/notes/${note.id}`),
          }));

    return [...matchedCommands, ...matchedNotes];
  }, [commands, notes, query, router]);

  React.useEffect(() => {
    setSelected(0);
  }, [query]);

  const run = (command: Command) => {
    setOpen(false);
    void command.run();
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const command = results[selected];
    if (command) run(command);
    else if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((value) => Math.max(value - 1, 0));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" hideClose>
        <DialogTitle className="sr-only">پالت دستورها</DialogTitle>
        <form onSubmit={onSubmit} className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="جستجو یا اجرای دستور…"
            aria-label="جستجو یا اجرای دستور"
            className="h-12 w-full bg-transparent text-sm outline-none"
          />
          <span className="kbd shrink-0">Esc</span>
        </form>

        <div className="max-h-80 overflow-y-auto p-1.5" role="listbox" aria-label="نتایج دستورها">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              نتیجه‌ای نبود. Enter را بزنید تا جستجو در همه یادداشت‌ها اجرا شود.
            </p>
          )}
          {results.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                type="button"
                role="option"
                aria-selected={index === selected}
                onMouseEnter={() => setSelected(index)}
                onClick={() => run(command)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-sm',
                  index === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                {command.hint && <span className="shrink-0 text-[11px] text-muted-foreground">{command.hint}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <span>↑↓ حرکت · Enter انتخاب</span>
          <span className="flex items-center gap-1">
            <span className="kbd">⌘K</span> برای باز/بسته کردن
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
