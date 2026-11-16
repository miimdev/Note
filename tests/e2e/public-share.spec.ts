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
