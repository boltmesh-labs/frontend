import { test, expect } from './fixtures/test';
import { mockJson } from './fixtures/api';
import { buildUser } from './fixtures/data';

const adminUser = buildUser({
  id: 'user-2',
  username: 'admin-user',
  email: 'admin-user@example.com',
  role: 'admin',
});

const mockAdminUsers = async (page, { status = 200, data = [adminUser], delayMs = 0 } = {}) => {
  await mockJson(page, {
    path: '/admin/users',
    status,
    delayMs,
    body:
      status >= 400 ? { detail: 'User service unavailable' } : { data, total_count: data.length },
  });
};

const openAdminUsers = async (page) => {
  await page.getByRole('link', { name: 'Admin Panel' }).click();
  await expect(page.getByRole('heading', { name: 'User Accounts' })).toBeVisible();
};

test('the admin user table shows an API error and retry action', async ({ adminPage: page }) => {
  await mockAdminUsers(page, { status: 500 });

  await openAdminUsers(page);

  await expect(page.getByText('User service unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('the admin user table shows an empty state', async ({ adminPage: page }) => {
  await mockAdminUsers(page, { data: [] });

  await openAdminUsers(page);

  await expect(page.getByText('No records found matching your request.')).toBeVisible();
});

test('the admin user table exposes its loading state', async ({ adminPage: page }) => {
  await mockAdminUsers(page, { delayMs: 1000 });

  await page.getByRole('link', { name: 'Admin Panel' }).click();

  await expect(page.getByRole('status', { name: 'Synchronizing records...' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'admin-user' })).toBeVisible();
});

test('an admin can confirm and apply a user status change', async ({ adminPage: page }) => {
  await mockAdminUsers(page);
  await mockJson(page, {
    method: 'PATCH',
    path: '/admin/users/user-2/status',
    body: {},
  });

  await openAdminUsers(page);
  await page.getByRole('button', { name: 'Deactivate account for admin-user' }).click();
  await expect(page.getByText('Deactivate Account', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Activate account for admin-user' })).toBeVisible();
  await expect(page.getByText('User status updated')).toBeVisible();
});

test('a failed user status change rolls back the optimistic update', async ({
  adminPage: page,
}) => {
  await mockAdminUsers(page);
  await mockJson(page, {
    method: 'PATCH',
    path: '/admin/users/user-2/status',
    status: 500,
    body: { detail: 'Status update rejected' },
  });

  await openAdminUsers(page);
  await page.getByRole('button', { name: 'Deactivate account for admin-user' }).click();
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();

  await expect(
    page.getByRole('button', { name: 'Deactivate account for admin-user' })
  ).toBeVisible();
  await expect(page.getByText('Status update rejected')).toBeVisible();
});
