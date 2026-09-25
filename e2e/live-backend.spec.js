import { test, expect } from './fixtures/test';

const liveEnabled =
  process.env.E2E_LIVE === '1' &&
  Boolean(process.env.E2E_USERNAME) &&
  Boolean(process.env.E2E_PASSWORD);
const adminLiveEnabled =
  liveEnabled && Boolean(process.env.E2E_ADMIN_USERNAME) && Boolean(process.env.E2E_ADMIN_PASSWORD);
const liveApiUrl = (process.env.E2E_API_URL || process.env.VITE_API_URL || '').replace(/\/$/, '');
const liveApiAssertionsEnabled = liveEnabled && Boolean(liveApiUrl);
const liveFrontendOrigin = new URL(process.env.E2E_BASE_URL || 'http://127.0.0.1:5173').origin;

const signIn = async (page, username, password) => {
  const response = await page.goto('/login');
  expect(response?.status(), 'The configured live frontend is unavailable').toBeLessThan(500);
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

const getLiveAccessToken = async (page) => {
  const response = await page.context().request.post(`${liveApiUrl}/auth/refresh-token`, {
    headers: { Origin: liveFrontendOrigin },
  });
  expect(response.ok(), `Refresh endpoint returned HTTP ${response.status()}`).toBe(true);

  const { access_token: accessToken } = await response.json();
  expect(accessToken, 'Refresh endpoint did not return an access token').toBeTruthy();
  return accessToken;
};

const getLiveJson = async (page, accessToken, path) => {
  const response = await page.context().request.get(`${liveApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.ok(), `${path} returned HTTP ${response.status()}`).toBe(true);
  return response.json();
};

const getFirstRecord = (payload) => {
  const records = Array.isArray(payload) ? payload : payload?.data;
  return Array.isArray(records) ? records[0] : undefined;
};

const openLiveErrorPage = async (page, path, apiPath) => {
  const responsePromise = page.waitForResponse((response) => {
    const { pathname } = new URL(response.url());
    return response.request().method() === 'GET' && pathname.endsWith(apiPath);
  });

  await navigateWithinApp(page, path);
  const response = await responsePromise;
  expect(response.status(), `${apiPath} should reject an unknown record`).toBe(404);
  await expect(page.getByRole('alert')).toBeVisible();
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

test('a real backend enforces admin authorization for API requests', async ({ page }) => {
  test.skip(!liveApiAssertionsEnabled, 'Set E2E_API_URL to run direct API authorization checks.');

  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  const accessToken = await getLiveAccessToken(page);
  const response = await page.context().request.get(`${liveApiUrl}/admin/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  expect([401, 403]).toContain(response.status());
});

test('a real backend revokes the refresh session on logout', async ({ page, playwright }) => {
  test.skip(!liveApiAssertionsEnabled, 'Set E2E_API_URL to verify refresh-session revocation.');

  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  const refreshCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'refresh_token'
  );
  expect(refreshCookie, 'Login did not set a refresh_token cookie').toBeTruthy();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);

  const requestContext = await playwright.request.newContext({ baseURL: liveApiUrl });
  try {
    await requestContext.addCookies([refreshCookie]);
    const response = await requestContext.post('/auth/refresh-token', {
      headers: { Origin: liveFrontendOrigin },
    });
    expect(response.status()).toBe(401);
  } finally {
    await requestContext.dispose();
  }
});

test('real user detail pages load records returned by the backend', async ({ page }) => {
  test.skip(!liveApiAssertionsEnabled, 'Set E2E_API_URL to discover records for detail coverage.');

  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
  const accessToken = await getLiveAccessToken(page);

  const pages = [
    {
      collectionPath: '/subscriptions',
      path: (record) => `/subscriptions/${record.id}`,
      apiPath: (record) => `/subscriptions/${record.id}`,
      heading: 'Subscription Details',
    },
    {
      collectionPath: '/invoices',
      path: (record) => `/invoices/${record.id}`,
      apiPath: (record) => `/invoices/${record.id}`,
      heading: 'Invoice Details',
    },
  ];

  for (const pageUnderTest of pages) {
    const payload = await getLiveJson(page, accessToken, pageUnderTest.collectionPath);
    const record = getFirstRecord(payload);
    if (!record) {
      test.info().annotations.push({
        type: 'coverage',
        description: `No ${pageUnderTest.collectionPath} record was available`,
      });
      continue;
    }

    await test.step(`loads the first ${pageUnderTest.collectionPath} record`, async () => {
      const apiPath = pageUnderTest.apiPath(record);
      await openLiveDataPage(page, {
        path: pageUnderTest.path(record),
        apiPath,
        heading: pageUnderTest.heading,
      });
      await expect(page.getByText(record.id, { exact: true }).first()).toBeVisible();
      await expect(page.locator('.alert-danger')).toHaveCount(0);
    });
  }
});

test('real admin detail pages load records returned by the backend', async ({ page }) => {
  test.skip(!adminLiveEnabled, 'Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD.');
  test.skip(!liveApiAssertionsEnabled, 'Set E2E_API_URL to discover records for detail coverage.');

  await signIn(page, process.env.E2E_ADMIN_USERNAME, process.env.E2E_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
  const accessToken = await getLiveAccessToken(page);

  const pages = [
    {
      collectionPath: '/admin/users',
      detailSuffix: '/profile',
      path: (record) => `/admin/users/${record.id}`,
      heading: () => 'User Profile',
    },
    {
      collectionPath: '/admin/plans',
      path: (record) => `/admin/plans/${record.id}`,
      heading: (record) => record.name,
    },
    {
      collectionPath: '/admin/subscriptions',
      path: (record) => `/admin/subscriptions/${record.id}`,
      heading: () => 'Subscription',
    },
    {
      collectionPath: '/admin/invoices',
      path: (record) => `/admin/invoices/${record.id}`,
      heading: () => 'Invoice',
    },
    {
      collectionPath: '/admin/payments',
      path: (record) => `/admin/payments/${record.id}`,
      heading: () => 'Payment',
    },
    {
      collectionPath: '/admin/vpn-regions',
      path: (record) => `/admin/vpn-regions/${record.id}`,
      heading: (record) => record.name,
    },
    {
      collectionPath: '/admin/vpn-servers',
      path: (record) => `/admin/vpn-servers/${record.id}`,
      heading: (record) => record.name,
    },
    {
      collectionPath: '/admin/vpn-devices',
      path: (record) => `/admin/vpn-devices/${record.id}`,
      heading: () => 'VPN Device',
    },
  ];

  for (const pageUnderTest of pages) {
    const payload = await getLiveJson(page, accessToken, pageUnderTest.collectionPath);
    const record = getFirstRecord(payload);
    if (!record) {
      test.info().annotations.push({
        type: 'coverage',
        description: `No ${pageUnderTest.collectionPath} record was available`,
      });
      continue;
    }

    await test.step(`loads the first ${pageUnderTest.collectionPath} record`, async () => {
      const detailPath = `${pageUnderTest.collectionPath}/${record.id}${pageUnderTest.detailSuffix || ''}`;
      await openLiveDataPage(page, {
        path: pageUnderTest.path(record),
        apiPath: detailPath,
        heading: pageUnderTest.heading(record),
      });
      await expect(page.locator('.alert-danger')).toHaveCount(0);

      if (pageUnderTest.collectionPath === '/admin/vpn-devices') {
        const peerLink = page.locator('a[href^="/admin/vpn-devices/peer/"]').first();
        if (await peerLink.count()) {
          const peerId = (await peerLink.getAttribute('href')).split('/').at(-1);
          const peerResponse = page.waitForResponse((response) => {
            const { pathname } = new URL(response.url());
            return pathname.endsWith(`/admin/vpn-peers/${peerId}`);
          });
          await peerLink.click();
          expect((await peerResponse).ok()).toBe(true);
          await expect(page.getByRole('heading', { name: 'VPN Peer', exact: true })).toBeVisible();
        }
      }
    });
  }
});

test('unknown real user and admin records render controlled error states', async ({ page }) => {
  test.skip(!adminLiveEnabled, 'Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD.');
  test.skip(!liveApiAssertionsEnabled, 'Set E2E_API_URL to run real not-found checks.');

  const missingUuid = '00000000-0000-4000-8000-000000000000';
  const userPages = [
    { path: `/invoices/${missingUuid}`, apiPath: `/invoices/${missingUuid}` },
    { path: `/subscriptions/${missingUuid}`, apiPath: `/subscriptions/${missingUuid}` },
  ];
  const adminPages = [
    { path: '/admin/plans/e2e-missing-plan', apiPath: '/admin/plans/e2e-missing-plan' },
    { path: `/admin/vpn-devices/${missingUuid}`, apiPath: `/admin/vpn-devices/${missingUuid}` },
  ];

  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  for (const pageUnderTest of userPages) {
    await test.step(`handles missing ${pageUnderTest.apiPath}`, async () => {
      await openLiveErrorPage(page, pageUnderTest.path, pageUnderTest.apiPath);
    });
  }

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, process.env.E2E_ADMIN_USERNAME, process.env.E2E_ADMIN_PASSWORD);

  for (const pageUnderTest of adminPages) {
    await test.step(`handles missing ${pageUnderTest.apiPath}`, async () => {
      await openLiveErrorPage(page, pageUnderTest.path, pageUnderTest.apiPath);
    });
  }
});

test('the deployed frontend has configured metadata', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response?.status(), 'The configured live frontend is unavailable').toBeLessThan(500);

  await expect(page).toHaveTitle(/Secure Private Internet \| .+/);
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute('content', /Secure your connection with .+/);
  await expect(description).not.toHaveAttribute('content', /%VITE_APP_COMPANY_NAME%/);
  await expect(page).not.toHaveTitle(/%VITE_APP_COMPANY_NAME%/);
});

test('a real session keeps credentials out of browser storage', async ({ page }) => {
  test.skip(!liveApiUrl.startsWith('https://'), 'Cookie security checks require an HTTPS API.');

  await signIn(page, process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  const browserState = await page.evaluate(() => ({
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
  }));
  const serializedStorage = JSON.stringify(browserState).toLowerCase();
  expect(serializedStorage).not.toContain('access_token');
  expect(serializedStorage).not.toContain('refresh_token');
  expect(serializedStorage).not.toContain(process.env.E2E_PASSWORD.toLowerCase());

  const refreshCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'refresh_token'
  );
  expect(refreshCookie, 'Login did not set a refresh_token cookie').toBeTruthy();
  expect(refreshCookie.httpOnly).toBe(true);
  expect(refreshCookie.secure).toBe(true);
  expect(['Strict', 'Lax']).toContain(refreshCookie.sameSite);
});
