'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search, Sparkles } from 'lucide-react';
import type { SearchResult } from '@/types/database.types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSync } from '@/features/sync/sync-provider';
import { useNotesStore } from '@/store/notes-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HighlightText } from './highlight-text';
import { buildSearchParam, matchesQuery, normalizeFa } from '@/lib/search-query';
import { relativeTime, toPersianDigits } from '@/lib/jalali';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { noteHref } from '@/lib/paths';

type Mode = 'db' | 'local';

export function SearchScreen() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('q') ?? '';
  const [query, setQuery] = React.useState(initial);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [mode, setMode] = React.useState<Mode>('db');
  const [loading, setLoading] = React.useState(false);
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const { userId } = useSync();
  const notes = useNotesStore((state) => state.notes);
  const debounced = useDebouncedValue(query, 250);

  React.useEffect(() => {
    let active = true;

    async function run() {
      if (!userId) return;
      const trimmed = debounced.trim();
      if (!trimmed) {
        setResults([]);
        setMode('db');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const client = getSupabaseBrowserClient();
        const { data, error } = await client.rpc('search_notes', {
          q: buildSearchParam(trimmed),
          p_limit: 40,
          p_offset: 0,
          p_include_archived: includeArchived,
        });

        if (active && !error && data) {
          setResults(data as SearchResult[]);
          setMode('db');
        } else if (active) {
          throw new Error(error?.message ?? 'offline');
        }
      } catch {
        if (!active) return;
        // Offline / RPC failure: fuzzy local search over the IndexedDB cache.
        const local = notes
          .filter((note) => !note.deleted_at && (includeArchived || !note.is_archived))
          .filter((note) => matchesQuery({ title: note.title, text: note.content_text }, trimmed))
          .slice(0, 40)
          .map((note) => ({
            id: note.id,
            title: note.title,
            snippet: note.content_text.slice(0, 240),
            score: 1,
            updated_at: note.updated_at,
            is_archived: note.is_archived,
            folder_id: note.folder_id,
          }));
        setResults(local);
        setMode('local');
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [debounced, includeArchived, notes, userId]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Search className="h-5 w-5 text-primary" /> جستجو
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          جستجوی دوزبانه با تحمل خطای املایی؛ شامل عنوان، متن و پیوندها.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="مثلاً: برنامه‌ریزی پروژه یا project plan"
          className="h-10 flex-1"
          aria-label="عبارت جستجو"
          type="search"
        />
        <Button
          variant={includeArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIncludeArchived((value) => !value)}
          aria-pressed={includeArchived}
        >
          شامل آرشیو
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {loading ? 'در حال جستجو…' : `${toPersianDigits(results.length)} نتیجه`}
          {mode === 'local' && !loading && ' (جستجوی محلی/آفلاین)'}
        </span>
        {normalizeFa(query) !== query.trim().toLowerCase() && query.trim() && (
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> نرمال‌سازی فارسی فعال
          </span>
        )}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> در حال جستجو…
        </p>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          چیزی پیدا نشد. املای عبارت را تغییر دهید یا بخش کوتاه‌تری را جستجو کنید.
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {results.map((result) => (
          <li key={result.id}>
            <Link
              href={noteHref(result.id)}
              className="block rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <p className="font-medium">
                <HighlightText text={result.title || 'بدون عنوان'} query={query} />
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                <HighlightText text={result.snippet} query={query} />
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {relativeTime(result.updated_at)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
