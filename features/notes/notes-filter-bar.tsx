'use client';

import * as React from 'react';
import { ArrowDownWideNarrow, Archive, LayoutGrid, List, Star } from 'lucide-react';
import type { NoteSort } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const SORT_LABELS: Record<NoteSort, string> = {
  updated_desc: 'آخرین ویرایش',
  updated_asc: 'قدیمی‌ترین ویرایش',
  created_desc: 'تازه‌ترین ساخت',
  created_asc: 'قدیمی‌ترین ساخت',
  title_asc: 'عنوان (الف–ی)',
  title_desc: 'عنوان (ی–الف)',
};

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  sort: NoteSort;
  onSortChange: (sort: NoteSort) => void;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  favoritesOnly: boolean;
  onFavoritesChange: (value: boolean) => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  title: string;
  count: number;
};

export function NotesFilterBar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  favoritesOnly,
  onFavoritesChange,
  showArchived,
  onShowArchivedChange,
  title,
  count,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <span className="text-xs text-muted-foreground">{count} یادداشت</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="جستجو در عنوان و متن…"
          className="h-9 max-w-xs"
          aria-label="جستجو در یادداشت‌ها"
          type="search"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowDownWideNarrow className="h-3.5 w-3.5" />
              {SORT_LABELS[sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>مرتب‌سازی</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSortChange(value as NoteSort)}>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={favoritesOnly} onCheckedChange={(value) => onFavoritesChange(Boolean(value))}>
              <Star className="me-1.5 h-3.5 w-3.5" /> فقط علاقه‌مندی‌ها
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={(value) => onShowArchivedChange(Boolean(value))}>
              <Archive className="me-1.5 h-3.5 w-3.5" /> نمایش آرشیو
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ms-auto flex items-center rounded-md border p-0.5" role="group" aria-label="نمای فهرست">
          <button
            type="button"
            aria-label="نمای شبکه‌ای"
            aria-pressed={view === 'grid'}
            onClick={() => onViewChange('grid')}
            className={cn('rounded p-1.5', view === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="نمای فهرست"
            aria-pressed={view === 'list'}
            onClick={() => onViewChange('list')}
            className={cn('rounded p-1.5', view === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
