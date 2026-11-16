'use client';

import * as React from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AI_ENABLED, runAiAction } from './ai-actions';

type Action = 'summarize' | 'rewrite' | 'fix' | 'translate' | 'actions' | 'tags' | 'continue';

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'summarize', label: 'خلاصه‌سازی' },
  { id: 'rewrite', label: 'بازنویسی' },
  { id: 'fix', label: 'تصحیح متن' },
  { id: 'translate', label: 'ترجمه' },
  { id: 'actions', label: 'استخراج کارها' },
  { id: 'tags', label: 'پیشنهاد برچسب' },
  { id: 'continue', label: 'ادامه نوشتن' },
];

/** Optional assistant, hidden unless NEXT_PUBLIC_AI_ENABLED is true. */
export function AiPanel({ text, onInsert }: { text: string; onInsert?: (value: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [action, setAction] = React.useState<Action>('summarize');
  const [result, setResult] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  if (!AI_ENABLED) return null;

  const run = async (next: Action) => {
    setAction(next);
    setBusy(true);
    setResult('');
    try {
      const response = await runAiAction({ action: next, text, locale: 'fa' });
      setResult(response.result);
    } catch (error) {
      toast.error('دستیار پاسخ نداد', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" /> دستیار
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> دستیار هوشمند
            </DialogTitle>
            <DialogDescription>متن این یادداشت برای پردازش به سرور برنامه ارسال می‌شود.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-1.5">
            {ACTIONS.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={action === item.id ? 'default' : 'outline'}
                className="h-7 text-[11px]"
                disabled={busy}
                onClick={() => void run(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="min-h-24 rounded-lg border bg-muted/30 p-3 text-sm leading-6">
            {busy ? (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال پردازش…
              </span>
            ) : result ? (
              <p className="whitespace-pre-wrap">{result}</p>
            ) : (
              <span className="text-xs text-muted-foreground">یک عملیات انتخاب کنید.</span>
            )}
          </div>

          {result && onInsert && (
            <Button
              size="sm"
              onClick={() => {
                onInsert(result);
                setOpen(false);
              }}
            >
              افزودن به یادداشت
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
