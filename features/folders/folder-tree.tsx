'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Folder } from '@/types/database.types';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/jalali';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFolderActions } from './use-folder-actions';
import { RenameFolderDialog } from './rename-folder-dialog';

export type FolderNode = Folder & { children: FolderNode[] };

export function FolderTree({
  nodes,
  counts,
}: {
  nodes: FolderNode[];
  counts: Map<string, number>;
}) {
  const pathname = usePathname();
  const { removeFolder } = useFolderActions();
  const [renaming, setRenaming] = React.useState<Folder | null>(null);

  return (
    <ul className="flex flex-col gap-0.5" role="tree" aria-label="پوشه‌ها">
      {nodes.map((node) => (
        <FolderBranch
          key={node.id}
          node={node}
          counts={counts}
          pathname={pathname}
          onRename={setRenaming}
          onDelete={removeFolder}
          depth={0}
        />
      ))}
      <RenameFolderDialog folder={renaming} onOpenChange={(open) => !open && setRenaming(null)} />
    </ul>
  );
}

function FolderBranch({
  node,
  counts,
  pathname,
  onRename,
  onDelete,
  depth,
}: {
  node: FolderNode;
  counts: Map<string, number>;
  pathname: string;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  depth: number;
}) {
  const [open, setOpen] = React.useState(true);
  const href = `/folders/${node.id}`;
  const active = pathname === href;
  const count = counts.get(node.id) ?? 0;
  const hasChildren = node.children.length > 0;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md pe-1 text-sm transition-colors',
          active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
        )}
        style={{ paddingInlineStart: `${depth * 12}px` }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'بستن پوشه' : 'باز کردن پوشه'}
          className={cn('p-0.5 text-muted-foreground', !hasChildren && 'invisible')}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5">
          <FolderIcon
            className="h-4 w-4 shrink-0"
            style={node.color ? { color: node.color } : undefined}
          />
          <span className="truncate">
            {node.icon ? `${node.icon} ` : ''}
            {node.name}
          </span>
        </Link>
        {count > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {toPersianDigits(count)}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`گزینه‌های پوشه ${node.name}`}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background focus:opacity-100 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => onRename(node)}>
              <Pencil className="h-4 w-4" /> تغییر نام
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${href}?new=1`}>
                <Plus className="h-4 w-4" /> یادداشت جدید در این پوشه
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => onDelete(node)}>
              <Trash2 className="h-4 w-4" /> حذف پوشه
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && hasChildren && (
        <ul role="group" className="flex flex-col gap-0.5">
          {node.children.map((child) => (
            <FolderBranch
              key={child.id}
              node={child}
              counts={counts}
              pathname={pathname}
              onRename={onRename}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
