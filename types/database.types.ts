/**
 * Hand-written subset of the Supabase schema types.
 * Regenerate any time with: npm run gen:types
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: 'fa' | 'en';
  theme: 'light' | 'dark' | 'system';
  settings: ProfileSettings;
  created_at: string;
  updated_at: string;
};

export type ProfileSettings = {
  calendar?: 'jalali' | 'gregorian';
  editorFontSize?: 'sm' | 'md' | 'lg';
  aiEnabled?: boolean;
  dailyNoteFolderId?: string | null;
};

export type Folder = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: NoteContent;
  content_text: string;
  icon: string | null;
  cover_url: string | null;
  is_pinned: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  deleted_at: string | null;
  daily_date: string | null;
  version: number;
  last_edited_at: string;
  created_at: string;
  updated_at: string;
};

/** TipTap JSON document. Kept loose on purpose: content is validated server-side. */
export type NoteContent = {
  type: 'doc';
  content?: NoteNode[];
};

export type NoteNode = {
  type: string;
  attrs?: Record<string, Json | undefined>;
  content?: NoteNode[];
  marks?: { type: string; attrs?: Record<string, Json | undefined> }[];
  text?: string;
};

export type NoteSummary = Pick<
  Note,
  | 'id'
  | 'user_id'
  | 'folder_id'
  | 'title'
  | 'content_text'
  | 'icon'
  | 'cover_url'
  | 'is_pinned'
  | 'is_favorite'
  | 'is_archived'
  | 'deleted_at'
  | 'daily_date'
  | 'version'
  | 'last_edited_at'
  | 'created_at'
  | 'updated_at'
>;

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteTag = {
  note_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type NoteLink = {
  id: string;
  user_id: string;
  source_note_id: string;
  target_note_id: string | null;
  target_title: string;
  created_at: string;
  updated_at: string;
};

export type NoteVersion = {
  id: string;
  note_id: string;
  user_id: string;
  title: string;
  content: NoteContent;
  version: number;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  note_id: string;
  remind_at: string;
  is_done: boolean;
  fired_at: string | null;
  channel: 'browser' | 'in_app';
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  content: NoteContent;
  icon: string | null;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type SharedNote = {
  id: string;
  user_id: string;
  note_id: string;
  token: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: string;
  user_id: string;
  note_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  score: number;
  updated_at: string;
  is_archived: boolean;
  folder_id: string | null;
};

export type SharedNotePayload = {
  title: string;
  content: NoteContent;
  icon: string | null;
  cover_url: string | null;
  shared_at: string;
  expires_at: string | null;
  author_name: string | null;
};
