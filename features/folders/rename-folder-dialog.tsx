'use client';

import * as React from 'react';
import type { Folder } from '@/types/database.types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFolderActions } from './use-folder-actions';

export function RenameFolderDialog({
  folder,
  onOpenChange,
}: {
  folder: Folder | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState('');
  const { renameFolder } = useFolderActions();

  React.useEffect(() => {
    if (folder) setName(folder.name);
  }, [folder]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!folder || !name.trim()) return;
    await renameFolder(folder, name.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(folder)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>تغییر نام پوشه</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
            maxLength={120}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit">ذخیره</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
