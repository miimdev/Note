import { expect, test } from '@playwright/test';

/**
 * Auth screens work without Supabase credentials (they show a setup notice),
 * so these tests run in CI without secrets.
 */
test.describe('Authentication screens', () => {
  test('login page renders the form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('input[type="email"], [role="heading"]')).toBeVisible();
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
  });

  test('unauthenticated visitors are redirected from the workspace', async ({ page }) => {
    await page.goto('/notes');
    await expect(page).toHaveURL(/\/login/);
  });
});
