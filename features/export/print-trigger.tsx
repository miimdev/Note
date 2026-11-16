'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Opens the browser print dialog (used for the "PDF" export path). */
export function PrintTrigger({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [auto]);

  return (
    <div className="no-print mb-4 flex justify-end">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" /> چاپ / ذخیره PDF
      </Button>
    </div>
  );
}
