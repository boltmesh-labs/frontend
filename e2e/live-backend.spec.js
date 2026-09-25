import { test, expect } from './fixtures/test';

const liveEnabled =
  process.env.E2E_LIVE === '1' &&
  Boolean(process.env.E2E_USERNAME) &&
  Boolean(process.env.E2E_PASSWORD);
const adminLiveEnabled =
  liveEnabled && Boolean(process.env.E2E_ADMIN_USERNAME) && Boolean(process.env.E2E_ADMIN_PASSWORD);

const signIn = async (page, username, password) => {
  await page.goto('/login');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#main-content').getByRole('button', { name: 'Login', exact: true }).click();
};

test.beforeEach(() => {
  test.skip(!liveEnabled, 'Set E2E_LIVE=1, E2E_USERNAME, and E2E_PASSWORD to run live coverage.');
});

test('a real backend accepts a configured test user', async ({ page }) => {
  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
  await expect(page.getByText(process.env.E2E_USERNAME, { exact: true })).toBeVisible();
});

test('a real backend restores the session from the refresh cookie after reload', async ({
  page,
}) => {
  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.reload();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
});

test('a real backend logs the user out and keeps the session cleared', async ({ page }) => {
  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('a real backend authorizes the seeded admin account', async ({ page }) => {
  test.skip(
    !adminLiveEnabled,
    'Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to run live admin coverage.'
  );

  await signIn(page, process.env.E2E_ADMIN_USERNAME, process.env.E2E_ADMIN_PASSWORD);
  await page.locator('nav').getByRole('link', { name: 'Admin Panel' }).click();

  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'User Accounts' })).toBeVisible();
});
