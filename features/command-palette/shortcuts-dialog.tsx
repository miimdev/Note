'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUiStore } from '@/store/ui-store';

const GROUPS = [
  {
    title: 'عمومی',
    items: [
      { keys: ['Ctrl/⌘', 'K'], label: 'باز کردن پالت دستورها' },
      { keys: ['Ctrl/⌘', 'N'], label: 'یادداشت جدید' },
      { keys: ['Ctrl/⌘', 'S'], label: 'ذخیره فوری' },
      { keys: ['?'], label: 'همین راهنما' },
      { keys: ['Esc'], label: 'بستن پنجره‌ها' },
    ],
  },
  {
    title: 'پیمایش',
    items: [
      { keys: ['Ctrl/⌘', '⇧', 'D'], label: 'یادداشت روزانه' },
      { keys: ['Ctrl/⌘', '⇧', 'T'], label: 'سطل زباله' },
      { keys: ['Ctrl/⌘', '⇧', 'E'], label: 'جستجو' },
      { keys: ['Ctrl/⌘', '⇧', 'F'], label: 'حالت تمرکز' },
    ],
  },
  {
    title: 'ادیتور',
    items: [
      { keys: ['/'], label: 'منوی بلاک (اسلش)' },
      { keys: ['#', 'Space'], label: 'تیتر ۱' },
      { keys: ['##', 'Space'], label: 'تیتر ۲' },
      { keys: ['-', 'Space'], label: 'لیست نقطه‌ای' },
      { keys: ['1.', 'Space'], label: 'لیست شماره‌دار' },
      { keys: ['[ ]', 'Space'], label: 'چک‌لیست' },
      { keys: ['>', 'Space'], label: 'نقل‌قول' },
      { keys: ['```', 'Space'], label: 'بلوک کد' },
      { keys: ['**متن**'], label: 'ضخیم' },
      { keys: ['*متن*'], label: 'کج' },
      { keys: ['[[', 'عنوان', ']]'], label: 'لینک به یادداشت دیگر' },
      { keys: ['Ctrl/⌘', 'Z'], label: 'واگرد' },
      { keys: ['Ctrl/⌘', '⇧', 'Z'], label: 'ازنو' },
      { keys: ['Tab'], label: 'تورفتگی لیست' },
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUiStore((state) => state.shortcutsDialogOpen);
  const setOpen = useUiStore((state) => state.setShortcutsDialogOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>میانبرهای صفحه‌کلید</DialogTitle>
          <DialogDescription>برای سرعت بیشتر در نوشتن و پیمایش.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="muted-label mb-2">{group.title}</h3>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="flex shrink-0 flex-wrap gap-0.5">
                      {item.keys.map((key, index) => (
                        <kbd key={`${key}-${index}`} className="kbd">
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
