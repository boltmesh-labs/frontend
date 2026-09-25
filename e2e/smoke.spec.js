import { test, expect } from './fixtures/test';

test('guests can reach the login page', async ({ guestPage: page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('legal pages are publicly accessible', async ({ guestPage: page }) => {
  await page.goto('/terms');

  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
});

test('unknown routes show the 404 page', async ({ guestPage: page }) => {
  await page.goto('/does-not-exist');

  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('guests are redirected away from protected routes', async ({ guestPage: page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});
