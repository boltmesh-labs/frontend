import { test, expect } from '@playwright/test';

const createAccessToken = ({ id, role }) => {
  const payload = Buffer.from(JSON.stringify({ sub: id, role })).toString('base64url');
  return `header.${payload}.signature`;
};

const mockApi = async (page) => {
  const accessToken = createAccessToken({ id: 'user-1', role: 'user' });

  await page.route('**/auth/refresh-token', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'No active session' }),
    });
  });

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: accessToken }),
    });
  });

  await page.route('**/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'test-user',
        email: 'test@example.com',
        is_verified: true,
        active_subscription: null,
      }),
    });
  });

  await page.route('**/auth/logout', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
};

const signIn = async (page) => {
  await page.goto('/login');
  await page.locator('#username').fill('test-user');
  await page.locator('#password').fill('test-password');
  await page.locator('#main-content').getByRole('button', { name: 'Login', exact: true }).click();
};

test('a user can sign in and reach the dashboard', async ({ page }) => {
  await mockApi(page);
  await signIn(page);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
  await expect(page.getByText('test-user', { exact: true })).toBeVisible();
});

test('a user can sign out and return to login', async ({ page }) => {
  await mockApi(page);
  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});
