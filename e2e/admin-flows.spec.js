import { test, expect } from './fixtures/test';
import { mockJson } from './fixtures/api';
import { buildUser } from './fixtures/data';

const adminUser = buildUser({
  id: 'user-2',
  username: 'admin-user',
  email: 'admin-user@example.com',
  role: 'admin',
});

const mockAdminApi = async (page) => {
  await mockJson(page, {
    path: '/admin/users',
    body: {
      data: [adminUser],
      total_count: 1,
    },
  });
  await mockJson(page, {
    path: '/admin/vpn-servers',
    body: {
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
    },
  });
};

test('an admin can open user and VPN server management', async ({ adminPage: page }) => {
  await mockAdminApi(page);

  await page.locator('nav').getByRole('link', { name: 'Admin Panel' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'User Accounts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'admin-user' })).toBeVisible();

  await page.getByRole('link', { name: /VPN Servers/ }).click();
  await expect(page.getByRole('heading', { name: 'VPN Server Management' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Test Server' })).toBeVisible();
});
