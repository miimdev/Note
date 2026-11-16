'use client';

import * as React from 'react';
import type { Editor, Range } from '@tiptap/core';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SlashMenuItem = {
  title: string;
  subtitle: string;
  keywords: string[];
  icon: LucideIcon;
  command: (props: { editor: Editor; range: Range }) => void;
};

export type SlashMenuProps = {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
  query: string;
};

export type SlashMenuRef = { onKeyDown: (event: KeyboardEvent) => boolean };

export const SlashMenu = React.forwardRef<SlashMenuRef, SlashMenuProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = React.useState(0);
    const selectedRef = React.useRef(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      selectedRef.current = selected;
    }, [selected]);

    React.useEffect(() => {
      selectedRef.current = 0;
      setSelected(0);
    }, [items]);

    React.useEffect(() => {
      const node = containerRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
      node?.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    React.useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (items.length === 0) return false;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          const next = (selectedRef.current + delta + items.length) % items.length;
          selectedRef.current = next;
          setSelected(next);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          // Read the ref: the key may arrive before React re-renders the handle.
          const item = items[selectedRef.current];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="w-64 rounded-lg border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
          موردی پیدا نشد
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        role="listbox"
        aria-label="دستورهای اسلش"
        className="z-50 max-h-80 w-72 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in-0"
        dir="rtl"
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              data-index={index}
              role="option"
              aria-selected={index === selected}
              onMouseEnter={() => setSelected(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                command(item);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm transition-colors',
                index === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{item.title}</span>
                <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  },
);

SlashMenu.displayName = 'SlashMenu';
