'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { markdownToDoc, splitMarkdownTitle } from '@/lib/markdown-import';
import { useNoteActions } from '@/features/notes/use-note-actions';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export function ImportMarkdownButton({ folderId = null }: { folderId?: string | null }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const { createNote } = useNoteActions();
  const router = useRouter();

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    let lastId: string | null = null;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_IMPORT_BYTES) {
          toast.error(`${file.name} بزرگ‌تر از ۲ مگابایت است`);
          continue;
        }
        const text = await file.text();
        const fallback = file.name.replace(/\.(md|markdown|txt)$/i, '');
        const { title, body } = splitMarkdownTitle(text, fallback);
        lastId = await createNote({ title, content: markdownToDoc(body), folderId });
      }
      if (lastId) {
        toast.success('فایل‌ها وارد شدند');
        router.push(`/notes/${lastId}`);
      }
    } catch (error) {
      toast.error('ورود فایل ناموفق بود', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,.txt"
        multiple
        className="hidden"
        onChange={(event) => event.target.files && void handleFiles(event.target.files)}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy} className="gap-1.5">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
        ورود Markdown
      </Button>
    </>
  );
}
