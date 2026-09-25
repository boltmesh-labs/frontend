import { test, expect } from '@playwright/test';

test('mobile navigation can be opened from the login page', async ({ page }) => {
  await page.route('**/auth/refresh-token', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'No active session' }),
    });
  });

  await page.goto('/login');

  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('#navbar-nav')).toHaveClass(/show/);
});
