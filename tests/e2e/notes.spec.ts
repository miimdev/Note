import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('Notes (authenticated)', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL / E2E_PASSWORD to run authenticated flows');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: /^ورود$/ }).click();
    await page.waitForURL(/\/notes/);
  });

  test('creates a note and saves it', async ({ page }) => {
    await page
      .getByRole('button', { name: /یادداشت جدید/ })
      .first()
      .click();
    await page.waitForURL(/\/notes\/[0-9a-f-]+/);
    await page.getByLabel('عنوان یادداشت').fill('یادداشت آزمایشی');
    await page.locator('.ProseMirror').click();
    await page.keyboard.type('سلام دنیا');
    await expect(page.getByRole('status').filter({ hasText: /ذخیره شد|در صف/ })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('opens the command palette with the keyboard', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByLabel('جستجو یا اجرای دستور')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('searches across notes', async ({ page }) => {
    await page.goto('/search');
    await page.getByLabel('عبارت جستجو').fill('یادداشت');
    await expect(page.locator('ul li, p').first()).toBeVisible();
  });
});
