import type { Note, NoteSummary } from './database.types';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error' | 'conflict';

export type NoteSort =
  'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc';

export type NoteFilter = {
  query: string;
  folderId: string | null;
  tagIds: string[];
  sort: NoteSort;
  showArchived: boolean;
  favoritesOnly: boolean;
  pinnedFirst: boolean;
};

export type NavSection =
  'all' | 'favorites' | 'daily' | 'archive' | 'trash' | 'folder' | 'tag' | 'search';

export type EditorBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'codeBlock'
  | 'table'
  | 'horizontalRule'
  | 'image'
  | 'file';

export type OutboxEntry = {
  id?: number;
  entity: 'note' | 'folder' | 'tag' | 'note_tag' | 'reminder' | 'template';
  entityId: string;
  op: 'upsert' | 'delete';
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string | null;
};

export type LocalNote = NoteSummary & {
  content?: Note['content'];
  dirty?: 0 | 1;
  base_version?: number;
  pending_op?: 'upsert' | 'delete' | null;
  server_updated_at?: string | null;
};

export type ConflictInfo = {
  noteId: string;
  local: Note;
  remote: Note;
};

export type LinkRef = {
  id: string;
  title: string;
  direction: 'outgoing' | 'backlink';
  resolved: boolean;
};
