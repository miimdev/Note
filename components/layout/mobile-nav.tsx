'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, FileText, Globe, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const ITEMS = [
  { href: '/notes', label: 'یادداشت‌ها', icon: FileText },
  { href: '/daily', label: 'امروز', icon: CalendarDays },
  { href: '/graph', label: 'شبکه', icon: Globe },
  { href: '/settings', label: 'تنظیمات', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);

  return (
    <nav
      aria-label="ناوبری موبایل"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {ITEMS.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        aria-label="جستجو (⌘K)"
        className="mx-1 flex h-11 w-11 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Search className="h-5 w-5" />
      </button>

      {ITEMS.slice(2).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
