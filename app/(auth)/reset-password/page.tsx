import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'رمز جدید' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-48 w-full max-w-sm animate-pulse rounded-xl bg-muted" />}>
      <AuthForm mode="reset" />
    </Suspense>
  );
}
