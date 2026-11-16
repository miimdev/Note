import { expect, test } from '@playwright/test';

/**
 * Auth screens render in both configurations:
 *  - without Supabase credentials (what CI sees) the form is replaced by a setup
 *    notice, but the heading and the links between auth pages stay;
 *  - with credentials the full form renders.
 */
const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe('Authentication screens', () => {
  test('login page renders the form or the setup notice', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (configured) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /تنظیم نشده/ })).toBeVisible();
    }
  });

  test('login and signup are linked', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.getByRole('link', { name: /ثبت‌نام/ });
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('password recovery page is reachable', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /بازگشت به ورود/ })).toBeVisible();
  });

  test('unauthenticated visitors are redirected from the workspace', async ({ page }) => {
    await page.goto('/notes');
    await expect(page).toHaveURL(/\/login/);
  });
});
