'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2, Network, RefreshCw } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSync } from '@/features/sync/sync-provider';
import { useNotesStore } from '@/store/notes-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toPersianDigits } from '@/lib/jalali';

const GraphCanvas = dynamic(() => import('./graph-canvas').then((mod) => mod.GraphCanvas), {
  ssr: false,
  loading: () => <Skeleton className="h-[70vh] w-full rounded-xl" />,
});

type GraphData = {
  nodes: {
    id: string;
    title: string;
    is_favorite: boolean;
    folder_id: string | null;
    updated_at: string;
    tag_count: number;
  }[];
  edges: { source: string; target: string }[];
};

export function GraphScreen() {
  const { userId } = useSync();
  const notes = useNotesStore((state) => state.notes);
  const router = useRouter();
  const [data, setData] = React.useState<GraphData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const client = getSupabaseBrowserClient();
    const { data: payload, error } = await client.rpc('note_graph', { p_limit: 400 });

    if (error || !payload) {
      // Offline fallback: build the graph from the local cache.
      const localNodes = notes
        .filter((note) => !note.deleted_at && !note.is_archived)
        .map((note) => ({
          id: note.id,
          title: note.title,
          is_favorite: note.is_favorite,
          folder_id: note.folder_id,
          updated_at: note.updated_at,
          tag_count: 0,
        }));
      setData({ nodes: localNodes, edges: [] });
    } else {
      setData(payload as GraphData);
    }
    setLoading(false);
  }, [notes, userId]);

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const selectedNote = data?.nodes.find((node) => node.id === selected);

  return (
    <div className="mx-auto flex h-[calc(100dvh-6rem)] w-full max-w-6xl flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Network className="h-5 w-5 text-primary" /> شبکه دانش
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {data
              ? `${toPersianDigits(data.nodes.length)} یادداشت · ${toPersianDigits(data.edges.length)} پیوند`
              : 'در حال محاسبه…'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          بازخوانی
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        {loading && !data ? (
          <Skeleton className="h-full w-full rounded-xl" />
        ) : data && data.nodes.length > 0 ? (
          <GraphCanvas
            nodes={data.nodes}
            edges={data.edges}
            selectedId={selected}
            onSelect={(id) => setSelected(id === selected ? null : id)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
            <p className="text-sm font-medium">هنوز پیوندی برای نمایش نیست</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              با نوشتن <code className="rounded bg-muted px-1">[[عنوان یادداشت]]</code> در متن،
              یادداشت‌ها به هم وصل می‌شوند و اینجا دیده می‌شوند.
            </p>
          </div>
        )}
      </div>

      {selectedNote && (
        <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="truncate">{selectedNote.title || 'بدون عنوان'}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/notes/${selectedNote.id}`)}
          >
            باز کردن یادداشت
          </Button>
        </div>
      )}
    </div>
  );
}
