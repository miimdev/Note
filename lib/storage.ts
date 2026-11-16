'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const ATTACHMENT_BUCKET = 'note-attachments';
const MAX_SIZE = 25 * 1024 * 1024;

export type UploadResult = {
  path: string;
  publicUrl: string;
  size: number;
  mimeType: string;
  fileName: string;
};

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
}

/**
 * Uploads a file to the private bucket under `{userId}/{noteId}/...`.
 * A long-lived signed URL is returned so the editor and PDF export can display
 * the image without making the bucket public.
 */
export async function uploadAttachment(params: {
  file: File;
  noteId: string;
  userId: string;
}): Promise<UploadResult> {
  const { file, noteId, userId } = params;

  if (file.size > MAX_SIZE) {
    throw new Error('حجم فایل نباید بیشتر از ۲۵ مگابایت باشد');
  }

  const client = getSupabaseBrowserClient();
  const path = `${userId}/${noteId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error } = await client.storage.from(ATTACHMENT_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (error) throw new Error(error.message);

  const { data: signed, error: signError } = await client.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError || !signed) throw new Error(signError?.message ?? 'ساخت لینک فایل ناموفق بود');

  await client.from('attachments').insert({
    user_id: userId,
    note_id: noteId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  });

  return {
    path,
    publicUrl: signed.signedUrl,
    size: file.size,
    mimeType: file.type,
    fileName: file.name,
  };
}

/** Re-creates a signed URL for an existing object. */
export async function getAttachmentUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteAttachment(path: string): Promise<void> {
  const client = getSupabaseBrowserClient();
  await client.storage.from(ATTACHMENT_BUCKET).remove([path]);
}
