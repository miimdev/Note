'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Tag } from '@/types/database.types';
import { cn } from '@/lib/utils';

export function TagList({ tags }: { tags: Tag[] }) {
  const pathname = usePathname();

  if (tags.length === 0) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">هنوز برچسبی ندارید</p>;
  }

  return (
    <ul className="mt-1 flex flex-wrap gap-1 px-1" aria-label="برچسب‌ها">
      {tags.slice(0, 24).map((tag) => {
        const href = `/tags/${tag.slug}`;
        const active = pathname === href;
        return (
          <li key={tag.id}>
            <Link
              href={href}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                active ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tag.color ?? 'currentColor' }}
                aria-hidden
              />
              {tag.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
