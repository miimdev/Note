import { buildTitleIndex, parseWikiLinks } from './links';
import { normalizeFa } from './search-query';
import type { NoteLink, NoteContent } from '@/types/database.types';

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

/** Wraps plain text back into a minimal TipTap document for the link parser. */
function textToDoc(text: string): NoteContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

type LinkSourceNote = {
  id: string;
  title: string;
  content_text?: string;
  deleted_at?: string | null;
};

/**
 * Offline replacement for the `note_links` queries: derives both outgoing links
 * and backlinks from the cached bodies of the user's notes.
 *
 * Unresolved links keep `target_note_id = null`, exactly like the database rows
 * for dangling `[[links]]`, so the UI can flag them the same way.
 */
export function buildLocalLinks(
  noteId: string,
  notes: LinkSourceNote[],
): { links: NoteLink[]; incoming: NoteLink[] } {
  const visible = notes.filter((note) => !note.deleted_at);
  const titleIndex = buildTitleIndex(visible);
  const current = visible.find((note) => note.id === noteId);
  const now = new Date().toISOString();

  const links: NoteLink[] = parseWikiLinks(
    current?.content_text ? textToDoc(current.content_text) : null,
  ).map((link, index) => ({
    id: `local-out-${index}`,
    user_id: '',
    source_note_id: noteId,
    target_note_id: titleIndex.get(link.normalized) ?? null,
    target_title: link.title,
    created_at: now,
    updated_at: now,
  }));

  const currentTitle = normalizeFa(current?.title ?? '');
  const incoming: NoteLink[] = [];

  if (currentTitle) {
    for (const note of visible) {
      if (note.id === noteId || !note.content_text) continue;
      const targets = parseWikiLinks(textToDoc(note.content_text));
      if (!targets.some((link) => link.normalized === currentTitle)) continue;
      incoming.push({
        id: `local-in-${note.id}`,
        user_id: '',
        source_note_id: note.id,
        target_note_id: noteId,
        target_title: current?.title ?? '',
        created_at: now,
        updated_at: now,
      });
    }
  }

  return { links, incoming };
}
