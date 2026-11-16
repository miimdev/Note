import type { Metadata } from 'next';
import { DailyScreen } from '@/features/daily/daily-screen';

export const metadata: Metadata = { title: 'یادداشت روزانه' };

export default function DailyPage() {
  return <DailyScreen />;
}
