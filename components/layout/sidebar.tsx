'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderPlus,
  Folder as FolderIcon,
  Globe,
  Hash,
  LayoutGrid,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSync } from '@/features/sync/sync-provider';
import { useNotesStore } from '@/store/notes-store';
import { useUiStore } from '@/store/ui-store';
import { FolderTree, type FolderNode } from '@/features/folders/folder-tree';
import { TagList } from '@/features/tags/tag-list';
import { NewFolderDialog } from '@/features/folders/new-folder-dialog';
import { useNoteActions } from '@/features/notes/use-note-actions';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toPersianDigits } from '@/lib/jalali';

const NAV_ITEMS = [
  { href: '/notes', label: 'همه یادداشت‌ها', icon: FileText },
  { href: '/favorites', label: 'علاقه‌مندی‌ها', icon: Star },
  { href: '/daily', label: 'یادداشت روزانه', icon: CalendarDays },
  { href: '/graph', label: 'شبکه دانش', icon: Globe },
  { href: '/templates', label: 'قالب‌ها', icon: LayoutGrid },
  { href: '/archive', label: 'آرشیو', icon: Archive },
  { href: '/trash', label: 'سطل زباله', icon: Trash2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebar, toggleSidebar, setCommandPaletteOpen } = useUiStore();
  const notes = useNotesStore((state) => state.notes);
  const folders = useNotesStore((state) => state.folders);
  const tags = useNotesStore((state) => state.tags);
  const { user, signOut } = useSync();
  const { createNote } = useNoteActions();
  const { resolvedTheme, setTheme } = useTheme();
  const [folderDialogOpen, setFolderDialogOpen] = React.useState(false);
  const [foldersOpen, setFoldersOpen] = React.useState(true);
  const [tagsOpen, setTagsOpen] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const collapsed = sidebar === 'collapsed';

  const counts = React.useMemo(() => {
    const visible = notes.filter((note) => !note.deleted_at);
    return {
      all: visible.filter((note) => !note.is_archived).length,
      favorites: visible.filter((note) => note.is_favorite && !note.is_archived).length,
      archive: visible.filter((note) => note.is_archived).length,
      trash: notes.filter((note) => note.deleted_at).length,
    };
  }, [notes]);

  const folderNodes = React.useMemo<FolderNode[]>(() => {
    const byParent = new Map<string | null, FolderNode[]>();
    const all = new Map<string, FolderNode>();
    for (const folder of folders) {
      all.set(folder.id, { ...folder, children: [] });
    }
    for (const folder of folders) {
      const node = all.get(folder.id)!;
      const list = byParent.get(folder.parent_id) ?? [];
      list.push(node);
      byParent.set(folder.parent_id, list);
    }
    for (const [, list] of byParent) {
      list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fa'));
    }
    const attach = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => ({
        ...node,
        children: attach(byParent.get(node.id) ?? []),
      }));
    return attach(byParent.get(null) ?? []);
  }, [folders]);

  const noteCountByFolder = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      if (note.deleted_at || note.is_archived || !note.folder_id) continue;
      map.set(note.folder_id, (map.get(note.folder_id) ?? 0) + 1);
    }
    return map;
  }, [notes]);

  const handleNewNote = async () => {
    setCreating(true);
    try {
      const id = await createNote({});
      if (id) router.push(`/notes/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {
      /* ignore */
    }
    await signOut();
  };

  if (collapsed) {
    return (
      <aside
        className="no-print flex h-dvh w-16 shrink-0 flex-col items-center gap-2 border-e bg-card/40 py-3"
        aria-label="نوار کناری جمع‌شده"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label="باز کردن نوار کناری"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <Button variant="default" size="icon-sm" onClick={handleNewNote} aria-label="یادداشت جدید">
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="جستجو و دستورها"
        >
          <Search className="h-4 w-4" />
        </Button>
        <div className="my-1 h-px w-8 bg-border" />
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.href}
              asChild
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              size="icon-sm"
            >
              <Link href={item.href} aria-label={item.label} title={item.label}>
                <Icon className="h-4 w-4" />
              </Link>
            </Button>
          );
        })}
        <div className="mt-auto flex flex-col gap-1">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/settings" aria-label="تنظیمات" title="تنظیمات">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="no-print flex h-dvh w-72 shrink-0 flex-col border-e bg-card/40"
      aria-label="نوار کناری"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <Link href="/notes" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm">Note</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="تغییر تم"
            title="تغییر تم"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="جمع کردن نوار کناری"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-3">
        <Button onClick={handleNewNote} disabled={creating} className="justify-start gap-2">
          <Plus className="h-4 w-4" />
          یادداشت جدید
        </Button>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            جستجو…
          </span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      <ScrollArea className="mt-3 flex-1 px-2 pb-4">
        <nav aria-label="بخش‌های اصلی" className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const count =
              item.href === '/notes'
                ? counts.all
                : item.href === '/favorites'
                  ? counts.favorites
                  : item.href === '/archive'
                    ? counts.archive
                    : item.href === '/trash'
                      ? counts.trash
                      : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {typeof count === 'number' && count > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {toPersianDigits(count)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setFoldersOpen((value) => !value)}
              aria-expanded={foldersOpen}
              className="muted-label flex items-center gap-1 hover:text-foreground"
            >
              {foldersOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              پوشه‌ها
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFolderDialogOpen(true)}
              aria-label="پوشه جدید"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {foldersOpen && (
            <div className="mt-1">
              {folderNodes.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">هنوز پوشه‌ای نساخته‌اید</p>
              ) : (
                <FolderTree nodes={folderNodes} counts={noteCountByFolder} />
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setTagsOpen((value) => !value)}
              aria-expanded={tagsOpen}
              className="muted-label flex items-center gap-1 hover:text-foreground"
            >
              {tagsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              برچسب‌ها
            </button>
            <Button variant="ghost" size="icon-sm" asChild aria-label="مدیریت برچسب‌ها">
              <Link href="/tags">
                <Hash className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {tagsOpen && <TagList tags={tags} />}
        </div>
      </ScrollArea>

      <div className="border-t p-2">
        <div className="flex items-center gap-2 rounded-md px-1.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
            {(user?.email ?? '?').slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user?.email ?? 'کاربر'}</p>
            <p className="truncate text-[11px] text-muted-foreground">همگام‌سازی خودکار فعال</p>
          </div>
          <Button asChild variant="ghost" size="icon-sm" aria-label="تنظیمات">
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleSignOut} aria-label="خروج از حساب">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1 flex flex-wrap gap-1 px-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Pin className="h-3 w-3" /> سنجاق
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> مرتب‌سازی
          </span>
          <span className="inline-flex items-center gap-1">
            <FolderIcon className="h-3 w-3" /> پوشه
          </span>
        </div>
      </div>

      <NewFolderDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen} />
    </aside>
  );
}
