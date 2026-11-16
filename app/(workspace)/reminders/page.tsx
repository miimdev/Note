import type { Metadata } from 'next';
import { RemindersScreen } from '@/features/reminders/reminders-screen';

export const metadata: Metadata = { title: 'یادآورها' };

export default function RemindersPage() {
  return <RemindersScreen />;
}
