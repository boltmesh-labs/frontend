import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/refresh-token', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'No active session' }),
    });
  });
});

test('guests can reach the login page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('legal pages are publicly accessible', async ({ page }) => {
  await page.goto('/terms');

  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
});

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/does-not-exist');

  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('guests are redirected away from protected routes', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});
