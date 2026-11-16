import type { NoteContent } from '@/types/database.types';
import { docToText } from './editor/content';
import { normalizeFa } from './search-query';

export type ParsedLink = { title: string; normalized: string };

const WIKI_LINK_RE = /\[\[([^\]\n]{1,200})\]\]/g;

/** All `[[wiki links]]` found in a document, de-duplicated by normalised title. */
export function parseWikiLinks(doc: NoteContent | null | undefined): ParsedLink[] {
  const text = docToText(doc);
  const map = new Map<string, ParsedLink>();
  for (const match of text.matchAll(WIKI_LINK_RE)) {
    const raw = (match[1] ?? '').trim();
    if (!raw) continue;
    const normalized = normalizeFa(raw);
    if (!map.has(normalized)) map.set(normalized, { title: raw, normalized });
  }
  return [...map.values()];
}

/** Resolves parsed links against a title -> id index. */
export function resolveLinks(
  links: ParsedLink[],
  titleIndex: Map<string, string>,
): { title: string; targetId: string | null }[] {
  return links.map((link) => ({
    title: link.title,
    targetId: titleIndex.get(link.normalized) ?? null,
  }));
}

/** Builds a normalised title -> note id index. */
export function buildTitleIndex(notes: { id: string; title: string }[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const note of notes) {
    if (!note.title.trim()) continue;
    const key = normalizeFa(note.title);
    if (!index.has(key)) index.set(key, note.id);
  }
  return index;
}

/** Replaces a wiki link title in-place while the target note is renamed. */
export function replaceLinkTitle(doc: NoteContent, from: string, to: string): NoteContent {
  const clone = structuredClone(doc);
  const walk = (node: { content?: unknown[]; text?: string }) => {
    if (typeof node.text === 'string') {
      node.text = node.text
        .split('[[')
        .join('[[')
        .replace(new RegExp(`\\[\\[${escapeRegExp(from)}\\]\\]`, 'g'), `[[${to}]]`);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child as { content?: unknown[]; text?: string });
    }
  };
  walk(clone);
  return clone;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Titles that should be suggested for a partially typed wiki link. */
export function filterTitleSuggestions(
  notes: { id: string; title: string }[],
  query: string,
  limit = 8,
): { id: string; title: string }[] {
  const q = normalizeFa(query);
  const candidates = notes.filter((note) => note.title.trim().length > 0);
  if (!q) return candidates.slice(0, limit);

  return candidates
    .map((note) => {
      const title = normalizeFa(note.title);
      const score = title.startsWith(q) ? 3 : title.includes(q) ? 2 : 0;
      return { note, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title))
    .slice(0, limit)
    .map((entry) => entry.note);
}
