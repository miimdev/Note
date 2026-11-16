import type { Metadata } from 'next';
import { SettingsScreen } from '@/features/settings/settings-screen';

export const metadata: Metadata = { title: 'تنظیمات' };

export default function SettingsPage() {
  return <SettingsScreen />;
}
