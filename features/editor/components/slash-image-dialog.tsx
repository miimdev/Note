'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadAttachment } from '@/lib/storage';

type Props = {
  editor: Editor;
  range: { from: number; to: number } | null;
  onClose: () => void;
  noteId: string;
  userId: string;
};

/** Image insert dialog used by the slash menu and the "insert image" action. */
export function SlashImageDialog({ editor, range, onClose, noteId, userId }: Props) {
  const [url, setUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const open = range !== null;

  const insert = (src: string, alt?: string) => {
    if (range) {
      editor.chain().focus().deleteRange(range).setImage({ src, alt }).run();
    } else {
      editor.chain().focus().setImage({ src, alt }).run();
    }
    setUrl('');
    setError(null);
    onClose();
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadAttachment({ file, noteId, userId });
      insert(result.publicUrl, file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود ناموفق بود');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>افزودن تصویر</DialogTitle>
          <DialogDescription>آدرس تصویر را وارد کنید یا فایل را آپلود کنید.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-url">آدرس تصویر</Label>
            <Input
              id="image-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-file">یا آپلود از دستگاه</Label>
            <Input
              id="image-file"
              type="file"
              accept="image/*"
              ref={fileRef}
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} type="button">
            انصراف
          </Button>
          <Button onClick={() => url.trim() && insert(url.trim())} disabled={!url.trim() || uploading}>
            افزودن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
