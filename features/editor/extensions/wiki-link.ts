'use client';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseNode } from '@tiptap/pm/model';
import { detectDirection } from '@/lib/text-direction';

const WIKI_LINK_RE = /\[\[[^\]\n]{1,200}\]\]/g;

export type WikiLinkOptions = {
  onOpen?: (title: string) => void;
};

/**
 * Styles `[[wiki links]]` inside the editor and opens the target note on click.
 * The document keeps the plain `[[title]]` syntax (the database parses it into
 * `note_links`), so this extension is presentation only.
 */
export const WikiLink = Extension.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return { onOpen: undefined };
  },

  addProseMirrorPlugins() {
    const onOpen = this.options.onOpen;

    const buildWikiDecorations = (doc: ProseNode): DecorationSet => {
      const decorations: Decoration[] = [];
      doc.descendants((node, pos) => {
        if (node.type.name !== 'text' || !node.text) return;
        for (const match of node.text.matchAll(WIKI_LINK_RE)) {
          const start = pos + (match.index ?? 0);
          const end = start + match[0].length;
          decorations.push(
            Decoration.inline(start, end, {
              class: 'wiki-link',
              'data-wiki-title': match[0].slice(2, -2),
            }),
          );
        }
      });
      return DecorationSet.create(doc, decorations);
    };

    return [
      new Plugin({
        key: new PluginKey('wikiLink'),
        state: {
          init: (_config, state) => buildWikiDecorations(state.doc),
          apply: (tr, previous) => (tr.docChanged ? buildWikiDecorations(tr.doc) : previous),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(view, _pos, event) {
            const target = event.target as HTMLElement | null;
            const title = target?.dataset?.wikiTitle;
            if (title && onOpen) {
              event.preventDefault();
              onOpen(title);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Detects the language direction of every block and sets `dir` on the DOM node,
 * so a Persian paragraph inside an English note (and vice versa) renders with
 * the correct alignment.
 */
export const AutoDirection = Extension.create({
  name: 'autoDirection',

  addProseMirrorPlugins() {
    const buildDirectionDecorations = (doc: ProseNode): DecorationSet => {
      const decorations: Decoration[] = [];
      doc.descendants((node, pos) => {
        if (!node.isBlock || node.isLeaf) return;
        const text = node.textContent;
        if (!text.trim()) return;
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            dir: detectDirection(text),
            class: 'text-start',
          }),
        );
      });
      return DecorationSet.create(doc, decorations);
    };

    return [
      new Plugin({
        key: new PluginKey('autoDirection'),
        state: {
          init: (_config, state) => buildDirectionDecorations(state.doc),
          apply: (tr, previous) => (tr.docChanged ? buildDirectionDecorations(tr.doc) : previous),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
