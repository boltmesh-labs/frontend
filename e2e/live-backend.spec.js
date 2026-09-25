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

const navigateWithinApp = async (page, path) => {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
};

const openLiveDataPage = async (page, { path, apiPath, heading }) => {
  const responsePromise = page.waitForResponse((response) => {
    const { pathname } = new URL(response.url());
    return response.request().method() === 'GET' && pathname.endsWith(apiPath);
  });

  await navigateWithinApp(page, path);
  const response = await responsePromise;
  expect(response.ok(), `${apiPath} returned HTTP ${response.status()}`).toBe(true);
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
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

test('a real backend rejects invalid credentials', async ({ page }) => {
  await signIn(page, process.env.E2E_USERNAME, `${process.env.E2E_PASSWORD}-invalid`);

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.locator('#main-content').getByRole('button', { name: 'Login', exact: true })
  ).toBeEnabled();
});

test('a real backend prevents a regular user from opening the admin area', async ({ page }) => {
  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
  await navigateWithinApp(page, '/admin/users');

  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
});

test('a real backend serves the authenticated user pages', async ({ page }) => {
  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  const pages = [
    { path: '/buy-plan', apiPath: '/plans', heading: 'Choose a VPN Plan' },
    { path: '/subscriptions', apiPath: '/subscriptions', heading: 'Subscriptions' },
    { path: '/invoices', apiPath: '/invoices', heading: 'Invoices & Billing' },
    { path: '/devices', apiPath: '/vpn-devices', heading: 'VPN Devices' },
    { path: '/account-settings', apiPath: '/users', heading: 'Account Settings' },
  ];

  for (const pageUnderTest of pages) {
    await test.step(`loads ${pageUnderTest.path}`, async () => {
      await openLiveDataPage(page, pageUnderTest);
      await expect(page.locator('.alert-danger')).toHaveCount(0);
    });
  }

  await navigateWithinApp(page, '/account-settings');
  await expect(page.locator('#formUsername')).toHaveValue(process.env.E2E_USERNAME);
  await page.getByRole('tab', { name: 'Security' }).click();
  await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
});

test('a real backend authorizes the seeded admin account', async ({ page }) => {
  test.skip(
    !adminLiveEnabled,
    'Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to run live admin coverage.'
  );

  await signIn(page, process.env.E2E_ADMIN_USERNAME, process.env.E2E_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.locator('nav').getByRole('link', { name: 'Admin Panel' }).click();

  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'User Accounts' })).toBeVisible();
});

test('a real backend serves the admin management lists', async ({ page }) => {
  test.skip(
    !adminLiveEnabled,
    'Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to run live admin coverage.'
  );

  await signIn(page, process.env.E2E_ADMIN_USERNAME, process.env.E2E_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  const pages = [
    { path: '/admin/users', apiPath: '/admin/users', heading: 'User Accounts' },
    { path: '/admin/plans', apiPath: '/admin/plans', heading: 'Subscription Plans' },
    {
      path: '/admin/subscriptions',
      apiPath: '/admin/subscriptions',
      heading: 'Subscription Management',
    },
    { path: '/admin/invoices', apiPath: '/admin/invoices', heading: 'Invoices' },
    {
      path: '/admin/payments',
      apiPath: '/admin/payments',
      heading: 'Payments Management',
    },
    {
      path: '/admin/vpn-regions',
      apiPath: '/admin/vpn-regions',
      heading: 'VPN Region Management',
    },
    {
      path: '/admin/vpn-servers',
      apiPath: '/admin/vpn-servers',
      heading: 'VPN Server Management',
    },
    { path: '/admin/vpn-devices', apiPath: '/admin/vpn-devices', heading: 'VPN Devices' },
    {
      path: '/admin/vpn-servers/audit',
      apiPath: '/admin/audit/node-registration-logs',
      heading: 'Node Registration Audit',
    },
  ];

  for (const pageUnderTest of pages) {
    await test.step(`loads ${pageUnderTest.path}`, async () => {
      await openLiveDataPage(page, pageUnderTest);
      await expect(page.getByRole('status', { name: 'Synchronizing records...' })).toBeHidden();
      await expect(page.locator('.alert-danger')).toHaveCount(0);
    });
  }
});
