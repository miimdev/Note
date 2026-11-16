'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFolderActions } from './use-folder-actions';
import { useNotesStore } from '@/store/notes-store';

export function NewFolderDialog({
  open,
  onOpenChange,
  parentId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
}) {
  const [name, setName] = React.useState('');
  const [parent, setParent] = React.useState<string | null>(parentId);
  const [saving, setSaving] = React.useState(false);
  const { createFolder } = useFolderActions();
  const folders = useNotesStore((state) => state.folders);

  React.useEffect(() => {
    if (open) {
      setName('');
      setParent(parentId);
    }
  }, [open, parentId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const folder = await createFolder({ name, parentId: parent });
    setSaving(false);
    if (folder) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>پوشه جدید</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">نام پوشه</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              maxLength={120}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-parent">پوشه والد</Label>
            <select
              id="folder-parent"
              value={parent ?? ''}
              onChange={(event) => setParent(event.target.value || null)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">— بدون والد (سطح اول) —</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              ساخت
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
