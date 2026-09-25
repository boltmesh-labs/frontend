import { test, expect } from './fixtures/test';

test('the production bundle serves the login page', async ({ guestPage: page }) => {
  await page.goto('/login');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  await expect(
    page.locator('#main-content').getByRole('button', { name: 'Login', exact: true })
  ).toBeVisible();
});
