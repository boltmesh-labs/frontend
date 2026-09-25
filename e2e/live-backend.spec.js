import { test, expect } from '@playwright/test';

const liveEnabled =
  process.env.E2E_LIVE === '1' &&
  Boolean(process.env.E2E_USERNAME) &&
  Boolean(process.env.E2E_PASSWORD);

test.skip(
  !liveEnabled,
  'Set E2E_LIVE=1, E2E_USERNAME, and E2E_PASSWORD to run live backend coverage.'
);

test('a real backend accepts a configured test user', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#username').fill(process.env.E2E_USERNAME);
  await page.locator('#password').fill(process.env.E2E_PASSWORD);
  await page.locator('#main-content').getByRole('button', { name: 'Login', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
});
