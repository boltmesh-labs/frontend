import { test, expect } from '@playwright/test';

import { mockAuthApi, signIn } from './fixtures/auth';

const mockAdminApi = async (page) => {
  await page.route('**/admin/users*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'user-2',
            username: 'admin-user',
            email: 'admin-user@example.com',
            is_active: true,
            role: 'admin',
          },
        ],
        total_count: 1,
      }),
    });
  });

  await page.route('**/admin/vpn-servers*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'server-1',
            name: 'Test Server',
            status: 'online',
            is_manual: true,
            region: { id: 'region-1', name: 'Test Region' },
          },
        ],
        total_count: 1,
      }),
    });
  });
};

test('an admin can open user and VPN server management', async ({ page }) => {
  await mockAuthApi(page, { role: 'admin' });
  await mockAdminApi(page);
  await signIn(page);

  await page.locator('nav').getByRole('link', { name: 'Admin Panel' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'User Accounts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'admin-user' })).toBeVisible();

  await page.getByRole('link', { name: /VPN Servers/ }).click();
  await expect(page.getByRole('heading', { name: 'VPN Server Management' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Test Server' })).toBeVisible();
});
