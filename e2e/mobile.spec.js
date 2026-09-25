import { test, expect } from './fixtures/test';

test('mobile navigation can be opened from the login page', async ({ guestPage: page }) => {
  await page.goto('/login');

  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('#navbar-nav')).toHaveClass(/show/);
});
