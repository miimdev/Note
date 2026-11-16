'use client';

import * as React from 'react';
import { Download, FileArchive, FileCode2, FileText, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { NoteContent } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportHtml, exportMarkdown, exportPdf } from './export-utils';
import { exportAllAsZip } from './zip-export';

export function ExportMenu({
  noteId,
  title,
  content,
  withZip = true,
}: {
  noteId: string;
  title: string;
  content: NoteContent;
  withZip?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);

  const runZip = async () => {
    setBusy(true);
    try {
      await exportAllAsZip();
      toast.success('فایل zip ساخته شد');
    } catch (error) {
      toast.error('ساخت zip ناموفق بود', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> خروجی
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => exportMarkdown(title, content)}>
          <FileText className="h-4 w-4" /> Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportHtml(title, content)}>
          <FileCode2 className="h-4 w-4" /> HTML
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportPdf(title, noteId)}>
          <Printer className="h-4 w-4" /> PDF (چاپ)
        </DropdownMenuItem>
        {withZip && (
          <DropdownMenuItem disabled={busy} onSelect={() => void runZip()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
            همه یادداشت‌ها (zip)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
