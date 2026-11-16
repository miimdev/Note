import { expect, test } from '@playwright/test';

test.describe('Public sharing', () => {
  test('invalid token shows a friendly message', async ({ page }) => {
    await page.goto('/s/deadbeefdeadbeefdeadbeef');
    await expect(page.getByText(/این لینک معتبر نیست|یادداشت پیدا نشد|معتبر نیست/)).toBeVisible();
  });

  test('share API rejects malformed tokens', async ({ request }) => {
    const response = await request.get('/api/share/not-a-token');
    expect(response.status()).toBe(400);
  });
});

test.describe('Public API', () => {
  test('report a server-side outage separately from a missing note', async ({ request }) => {
    const response = await request.get('/api/share/0123456789abcdef');
    // Either the note does not exist (404) or Supabase is unreachable (503).
    expect([404, 503]).toContain(response.status());
    const body = await response.json();
    expect(['not_found', 'unavailable']).toContain(body.error);
  });
});
