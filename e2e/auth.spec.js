import { test, expect } from './fixtures/test';

test('a user can sign in and reach the dashboard', async ({ userPage: page }) => {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
  await expect(page.getByText('test-user', { exact: true })).toBeVisible();
});

test('a user can sign out and return to login', async ({ userPage: page }) => {
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});
