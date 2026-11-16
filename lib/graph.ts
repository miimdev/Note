import { buildTitleIndex } from './links';
import { normalizeFa } from './search-query';

export type LocalGraphNode = {
  id: string;
  title: string;
  is_favorite: boolean;
  folder_id: string | null;
  updated_at: string;
  tag_count: number;
};

export type LocalGraphEdge = { source: string; target: string };

const WIKI_LINK_RE = /\[\[([^\]\n]{1,200})\]\]/g;

/**
 * Builds the knowledge graph from the local cache so the graph page still works
 * offline (the SQL `note_graph` RPC needs a network round-trip).
 *
 * Links are resolved against note titles using the same normalisation as the
 * database trigger, and self-links/dangling targets are dropped.
 */
export function buildLocalGraph(
  notes: {
    id: string;
    title: string;
    content_text: string;
    is_favorite: boolean;
    is_archived: boolean;
    deleted_at: string | null;
    folder_id: string | null;
    updated_at: string;
  }[],
  tagCounts: Map<string, number> = new Map(),
): { nodes: LocalGraphNode[]; edges: LocalGraphEdge[] } {
  const visible = notes.filter((note) => !note.deleted_at && !note.is_archived);
  const titleIndex = buildTitleIndex(visible);

  const nodes: LocalGraphNode[] = visible.map((note) => ({
    id: note.id,
    title: note.title,
    is_favorite: note.is_favorite,
    folder_id: note.folder_id,
    updated_at: note.updated_at,
    tag_count: tagCounts.get(note.id) ?? 0,
  }));

  const seen = new Set<string>();
  const edges: LocalGraphEdge[] = [];

  for (const note of visible) {
    for (const match of note.content_text.matchAll(WIKI_LINK_RE)) {
      const title = (match[1] ?? '').trim();
      if (!title) continue;

      const target = titleIndex.get(normalizeFa(title));
      if (!target || target === note.id) continue;

      const key = `${note.id}->${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: note.id, target });
    }
  }

  return { nodes, edges };
}
