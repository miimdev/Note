'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validation/schemas';
import { SupabaseSetupNotice } from './setup-notice';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

const COPY: Record<Mode, { title: string; description: string; submit: string }> = {
  signin: {
    title: 'ورود به Note',
    description: 'برای ادامه وارد حساب کاربری خود شوید.',
    submit: 'ورود',
  },
  signup: {
    title: 'ساخت حساب جدید',
    description: 'پس از ثبت‌نام، لینک تایید به ایمیل شما ارسال می‌شود.',
    submit: 'ثبت‌نام',
  },
  forgot: {
    title: 'بازیابی رمز عبور',
    description: 'ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود.',
    submit: 'ارسال لینک',
  },
  reset: {
    title: 'تعیین رمز جدید',
    description: 'رمزی تازه برای حساب خود انتخاب کنید.',
    submit: 'ذخیره رمز',
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/notes';
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isSupabaseConfigured) return <SupabaseSetupNotice />;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const displayName = String(formData.get('displayName') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
    const client = getSupabaseBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    setLoading(true);
    try {
      if (mode === 'signin') {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success)
          throw new Error(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر است');

        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        toast.success('خوش آمدید');
        router.push(nextPath);
        router.refresh();
      } else if (mode === 'signup') {
        const parsed = signUpSchema.safeParse({ email, password, displayName });
        if (!parsed.success)
          throw new Error(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر است');

        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/callback?next=${encodeURIComponent(nextPath)}`,
            data: { full_name: displayName || undefined },
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          toast.success('حساب ساخته شد');
          router.push(nextPath);
        } else {
          toast.success('ثبت‌نام انجام شد', { description: 'ایمیل خود را برای تایید بررسی کنید.' });
          router.push('/login');
        }
      } else if (mode === 'forgot') {
        const parsed = forgotPasswordSchema.safeParse({ email });
        if (!parsed.success)
          throw new Error(parsed.error.issues[0]?.message ?? 'ایمیل نامعتبر است');

        const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/callback?next=/reset-password`,
        });
        if (resetError) throw resetError;
        toast.success('لینک بازیابی ارسال شد', { description: 'صندوق ایمیل خود را ببینید.' });
      } else {
        const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
        if (!parsed.success)
          throw new Error(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر است');

        const { error: updateError } = await client.auth.updateUser({ password });
        if (updateError) throw updateError;
        toast.success('رمز عبور به‌روز شد');
        router.push('/notes');
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? translateAuthError(submitError.message)
          : 'خطای نامشخص رخ داد';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getSupabaseBrowserClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${siteUrl}/callback?next=${encodeURIComponent(nextPath)}` },
      });
      if (oauthError) throw oauthError;
    } catch (oauthError) {
      const message = oauthError instanceof Error ? oauthError.message : 'ورود با گوگل ناموفق بود';
      setError(message);
      setLoading(false);
    }
  };

  const copy = COPY[mode];

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        {mode === 'signup' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">نام نمایشی</Label>
            <Input id="displayName" name="displayName" autoComplete="name" maxLength={80} />
          </div>
        )}

        {mode !== 'reset' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">ایمیل</Label>
            <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required />
          </div>
        )}

        {mode !== 'forgot' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              name="password"
              type="password"
              dir="ltr"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </div>
        )}

        {mode === 'reset' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              dir="ltr"
              minLength={8}
              required
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {copy.submit}
        </Button>
      </form>

      {mode !== 'reset' && (
        <>
          <div className="my-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            یا
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon /> ادامه با گوگل
          </Button>
        </>
      )}

      <div className="mt-5 flex flex-col gap-1.5 text-center text-xs text-muted-foreground">
        {mode === 'signin' && (
          <>
            <Link href="/signup" className="text-primary hover:underline">
              حساب ندارید؟ ثبت‌نام کنید
            </Link>
            <Link href="/forgot-password" className="hover:underline">
              رمز عبور را فراموش کرده‌اید؟
            </Link>
          </>
        )}
        {mode === 'signup' && (
          <Link href="/login" className="text-primary hover:underline">
            حساب دارید؟ وارد شوید
          </Link>
        )}
        {(mode === 'forgot' || mode === 'reset') && (
          <Link href="/login" className="text-primary hover:underline">
            بازگشت به ورود
          </Link>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.5a7.2 7.2 0 0 1 0-4.6V6.8H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.8l4 3.1A7 7 0 0 1 12 4.8Z"
      />
    </svg>
  );
}

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'ایمیل یا رمز عبور درست نیست',
    'Email not confirmed': 'ایمیل شما هنوز تایید نشده است. صندوق ایمیل را بررسی کنید.',
    'User already registered': 'این ایمیل قبلاً ثبت شده است',
    'Password should be at least 6 characters': 'رمز عبور کوتاه است',
    'Email rate limit exceeded': 'تعداد تلاش‌ها زیاد است، کمی بعد دوباره امتحان کنید',
  };
  return map[message] ?? message;
}
