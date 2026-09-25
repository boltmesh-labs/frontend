import { test, expect } from './fixtures/test';
import { mockJson } from './fixtures/api';
import { mockRestoredAuthApi } from './fixtures/auth';

test('invalid credentials stay on the login page with the API error', async ({
  guestPage: page,
}) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/login',
    status: 401,
    body: { detail: 'Invalid username or password' },
  });

  await page.goto('/login');
  await page.locator('#username').fill('test-user');
  await page.locator('#password').fill('wrong-password');
  await page.locator('#main-content').getByRole('button', { name: 'Login', exact: true }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toHaveText(/Invalid username or password/);
});

test('a refresh token restores the session on a protected route', async ({ page }) => {
  await mockRestoredAuthApi(page);

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
  await expect(page.getByText('test-user', { exact: true })).toBeVisible();
});

test('a normal user is denied direct access to the admin area', async ({ page }) => {
  await mockRestoredAuthApi(page, { role: 'user' });

  await page.goto('/admin/users');

  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
});
