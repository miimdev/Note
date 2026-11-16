import { expect, test } from '@playwright/test';

test.describe('Offline shell', () => {
  test('offline page renders', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: /اتصال اینترنت قطع است/ })).toBeVisible();
  });

  test('manifest is served as a PWA manifest', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.short_name).toBe('Note');
    // The manifest is portable: relative URLs so the same file works at the
    // root and under `/<repo>/` on GitHub Pages.
    expect(manifest.start_url).toMatch(/^\.?\/?(notes\/?)$/);
    expect(Array.isArray(manifest.icons)).toBeTruthy();
  });
});
