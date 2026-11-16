'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  LayoutTemplate,
  Loader2,
  Plus,
  Rocket,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Template } from '@/types/database.types';
import { useNotesStore } from '@/store/notes-store';
import { useSync } from '@/features/sync/sync-provider';
import { useNoteActions } from '@/features/notes/use-note-actions';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getDb } from '@/lib/db/local-db';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { docToText, emptyDoc } from '@/lib/editor/content';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  'check-square': CheckSquare,
  'book-open': BookOpen,
  rocket: Rocket,
  'layout-template': LayoutTemplate,
};

export function TemplatesScreen() {
  const router = useRouter();
  const { userId } = useSync();
  const templates = useNotesStore((state) => state.templates);
  const setTemplates = useNotesStore((state) => state.setTemplates);
  const { createNote } = useNoteActions();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const useTemplate = async (template: Template) => {
    setBusyId(template.id);
    try {
      const id = await createNote({ title: template.name, content: template.content });
      if (id) router.push(`/notes/${id}`);
    } finally {
      setBusyId(null);
    }
  };

  const saveAsTemplate = async () => {
    if (!userId || !name.trim()) return;
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const content = emptyDoc();
      const { data, error } = await client
        .from('templates')
        .insert({
          user_id: userId,
          name: name.trim(),
          content,
          icon: 'layout-template',
          position: templates.length,
        })
        .select('*')
        .single();
      if (error) throw error;
      setTemplates([...templates, data as Template]);
      await getDb().templates.put(data as Template);
      setName('');
      setCreateOpen(false);
      toast.success('قالب ساخته شد', { description: 'برای ویرایش محتوا، یادداشتی از آن بسازید.' });
    } catch (error) {
      toast.error('ساخت قالب ناموفق بود', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async (template: Template) => {
    if (template.is_system) return;
    if (!window.confirm(`قالب «${template.name}» حذف شود؟`)) return;
    const client = getSupabaseBrowserClient();
    const { error } = await client.from('templates').delete().eq('id', template.id);
    if (error) {
      toast.error('حذف ناموفق بود');
      return;
    }
    setTemplates(templates.filter((item) => item.id !== template.id));
    await getDb().templates.delete(template.id);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">قالب‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            با یک کلیک، ساختار آماده را به یادداشت تبدیل کنید.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> قالب شخصی
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const Icon = ICONS[template.icon ?? ''] ?? LayoutTemplate;
          return (
            <article
              key={template.id}
              className="group flex flex-col gap-2 rounded-xl border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1">
                  {template.is_system && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      سیستمی
                    </span>
                  )}
                  {!template.is_system && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="حذف قالب"
                      onClick={() => void removeTemplate(template)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <h2 className="font-medium">{template.name}</h2>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {template.description || docToText(template.content).slice(0, 120) || 'قالب خالی'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-1 w-fit gap-1.5"
                disabled={busyId === template.id}
                onClick={() => void useTemplate(template)}
              >
                {busyId === template.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                استفاده
              </Button>
            </article>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>قالب جدید</DialogTitle>
            <DialogDescription>
              یک نام بگذارید؛ بعداً می‌توانید یادداشتی از آن بسازید و محتوا را ویرایش کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-name">نام قالب</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => void saveAsTemplate()} disabled={saving || !name.trim()}>
              ساخت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
