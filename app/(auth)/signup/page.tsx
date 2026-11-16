import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'ثبت‌نام' };

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-64 w-full max-w-sm animate-pulse rounded-xl bg-muted" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
