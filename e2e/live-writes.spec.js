import { test, expect } from './fixtures/test';

const liveApiUrl = (process.env.E2E_API_URL || '').replace(/\/$/, '');
const liveFrontendUrl = new URL(process.env.E2E_BASE_URL || 'http://127.0.0.1:5173');
const apiHostname = liveApiUrl ? new URL(liveApiUrl).hostname : '';
const frontendHostname = liveFrontendUrl.hostname;
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const blockedWriteHosts = new Set(['boltmesh.mooo.com', 'api.boltmesh.mooo.com']);
const writeEnvironment = process.env.E2E_WRITE_ENVIRONMENT || '';
const writeTargetIsSafe =
  (writeEnvironment === 'local' &&
    localHosts.has(apiHostname) &&
    localHosts.has(frontendHostname)) ||
  (writeEnvironment === 'staging' &&
    !blockedWriteHosts.has(apiHostname) &&
    !blockedWriteHosts.has(frontendHostname));
const writesEnabled =
  process.env.E2E_LIVE === '1' &&
  process.env.E2E_ALLOW_WRITES === '1' &&
  writeTargetIsSafe &&
  Boolean(process.env.E2E_USERNAME && process.env.E2E_PASSWORD) &&
  Boolean(process.env.E2E_ADMIN_USERNAME && process.env.E2E_ADMIN_PASSWORD);

const uniqueSuffix = `${Date.now()}-${process.pid}`;
const STRICT_RATE_LIMIT = 10;
const STRICT_WINDOW_MS = 61_000;
let strictRequestsRemaining = STRICT_RATE_LIMIT;

// The backend shares a 10-request-per-minute strict bucket across login and
// every write endpoint. Reserve each test's requests up front so the opt-in
// suite does not rate-limit its own cleanup paths halfway through a run.
const reserveStrictRequests = async (count) => {
  if (strictRequestsRemaining < count) {
    await new Promise((resolve) => setTimeout(resolve, STRICT_WINDOW_MS));
    strictRequestsRemaining = STRICT_RATE_LIMIT;
  }
  strictRequestsRemaining -= count;
};

const signInAndCaptureToken = async (page, username, password) => {
  const pageResponse = await page.goto('/login');
  expect(pageResponse?.status(), 'The configured live frontend is unavailable').toBeLessThan(500);

  const loginResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname.endsWith('/auth/login')
  );
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#main-content').getByRole('button', { name: 'Login', exact: true }).click();

  const response = await loginResponse;
  expect(response.ok(), `Login returned HTTP ${response.status()}`).toBe(true);
  const { access_token: accessToken } = await response.json();
  expect(accessToken, 'Login did not return an access token').toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard$/);

  return accessToken;
};

const navigateWithinApp = async (page, path) => {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
};

const deleteIfPresent = async (page, accessToken, path) => {
  const response = await page.context().request.delete(`${liveApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect([204, 404]).toContain(response.status());
};

test.beforeEach(() => {
  test.skip(
    !writesEnabled,
    'Set E2E_ALLOW_WRITES=1 and E2E_WRITE_ENVIRONMENT=local (or staging) to run write coverage.'
  );
  test.setTimeout(150_000);
});

test('an admin can create, edit, toggle, and delete a subscription plan', async ({ page }) => {
  await reserveStrictRequests(5);
  const accessToken = await signInAndCaptureToken(
    page,
    process.env.E2E_ADMIN_USERNAME,
    process.env.E2E_ADMIN_PASSWORD
  );
  const planId = `e2e-plan-${uniqueSuffix}`;
  const planName = `E2E Plan ${uniqueSuffix}`;
  const updatedPlanName = `${planName} Updated`;
  let planCreated = false;

  try {
    await navigateWithinApp(page, '/admin/plans/new');
    await expect(page.getByRole('heading', { name: 'Create Subscription Plan' })).toBeVisible();

    await page.locator('#planId').fill(planId);
    await page.locator('#planName').fill(planName);
    await page.locator('#planPrice').fill('1.25');
    await page.locator('#planDuration').fill('30');
    await page.locator('#planDevices').fill('1');
    await page.locator('#planDescription').fill('Disposable plan created by the live E2E suite.');
    await page.locator('#planFeatures').fill('E2E validation\nDisposable test resource');

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/admin/plans')
    );
    await page.getByRole('button', { name: 'Create Plan', exact: true }).click();
    expect((await createResponse).status()).toBe(201);
    planCreated = true;

    await expect(page).toHaveURL(/\/admin\/plans$/);
    await expect(page.getByRole('link', { name: planName, exact: true })).toBeVisible();

    await page.getByRole('link', { name: planName, exact: true }).click();
    await expect(page.getByRole('heading', { name: planName, exact: true })).toBeVisible();
    await page.locator('#planName').fill(updatedPlanName);

    const updateResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith(`/admin/plans/${planId}`)
    );
    await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
    expect((await updateResponse).ok()).toBe(true);

    await expect(page).toHaveURL(/\/admin\/plans$/);
    const planRow = page.getByRole('row').filter({ hasText: updatedPlanName });
    await expect(planRow.getByText('Active', { exact: true })).toBeVisible();

    await planRow.getByRole('button', { name: 'Disable', exact: true }).click();
    const disableDialog = page.getByRole('dialog');
    const toggleResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith(`/admin/plans/${planId}/toggle`)
    );
    await disableDialog.getByRole('button', { name: 'Disable Plan', exact: true }).click();
    expect((await toggleResponse).ok()).toBe(true);
    await expect(planRow.getByText('Disabled', { exact: true })).toBeVisible();

    await planRow.getByRole('link', { name: updatedPlanName, exact: true }).click();
    await page.getByRole('button', { name: 'Delete Plan', exact: true }).click();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname.endsWith(`/admin/plans/${planId}`)
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete Plan', exact: true })
      .click();
    expect((await deleteResponse).status()).toBe(204);
    planCreated = false;

    await expect(page).toHaveURL(/\/admin\/plans$/);
    await expect(page.getByRole('link', { name: updatedPlanName, exact: true })).toHaveCount(0);
  } finally {
    if (planCreated) {
      await deleteIfPresent(page, accessToken, `/admin/plans/${planId}`);
    }
  }
});

test('an admin can create, edit, toggle, and delete a VPN region', async ({ page }) => {
  await reserveStrictRequests(5);
  const accessToken = await signInAndCaptureToken(
    page,
    process.env.E2E_ADMIN_USERNAME,
    process.env.E2E_ADMIN_PASSWORD
  );
  const regionId = `e2e-region-${uniqueSuffix}`;
  const regionName = `E2E Region ${uniqueSuffix}`;
  const updatedRegionName = `${regionName} Updated`;
  let regionCreated = false;

  try {
    await navigateWithinApp(page, '/admin/vpn-regions/new');
    await expect(page.getByRole('heading', { name: 'Create VPN Region' })).toBeVisible();

    const regionIdInput = page.locator('input[name="id"]');
    await regionIdInput.fill(regionId);
    await page.locator('input[name="name"]').fill(regionName);
    await page.locator('input[name="country_code"]').fill('US');

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/admin/vpn-regions')
    );
    await page.getByRole('button', { name: 'Create Region', exact: true }).click();
    expect((await createResponse).status()).toBe(201);
    regionCreated = true;

    await navigateWithinApp(page, '/admin/vpn-regions');
    const regionRow = page.getByRole('row').filter({ hasText: regionId });
    await expect(regionRow).toBeVisible();

    await regionRow.getByRole('link', { name: `🌐 ${regionName}`, exact: true }).click();
    await page.getByRole('button', { name: '🔧 Edit Region', exact: true }).click();
    await page.locator('input[name="name"]').fill(updatedRegionName);

    const updateResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith(`/admin/vpn-regions/${regionId}`)
    );
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    expect((await updateResponse).ok()).toBe(true);
    await expect(page.getByRole('heading', { name: updatedRegionName, exact: true })).toBeVisible();

    await navigateWithinApp(page, '/admin/vpn-regions');
    const updatedRegionRow = page.getByRole('row').filter({ hasText: regionId });
    await updatedRegionRow
      .getByRole('checkbox', { name: `Toggle active status for ${updatedRegionName}` })
      .click();
    const toggleResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith(`/admin/vpn-regions/${regionId}`)
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Deactivate', exact: true }).click();
    expect((await toggleResponse).ok()).toBe(true);
    await expect(updatedRegionRow.getByRole('status')).toHaveText('inactive');

    await updatedRegionRow.getByRole('link', { name: `🌐 ${updatedRegionName}` }).click();
    await page.getByRole('button', { name: 'Delete Region', exact: true }).click();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname.endsWith(`/admin/vpn-regions/${regionId}`)
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete Region', exact: true })
      .click();
    expect((await deleteResponse).status()).toBe(204);
    regionCreated = false;

    await expect(page).toHaveURL(/\/admin\/vpn-regions$/);
    await expect(page.getByRole('row').filter({ hasText: regionId })).toHaveCount(0);
  } finally {
    if (regionCreated) {
      await deleteIfPresent(page, accessToken, `/admin/vpn-regions/${regionId}`);
    }
  }
});

test('a user can update their profile and the original value is restored', async ({ page }) => {
  await reserveStrictRequests(3);
  const accessToken = await signInAndCaptureToken(
    page,
    process.env.E2E_USERNAME,
    process.env.E2E_PASSWORD
  );
  const profileResponse = await page.context().request.get(`${liveApiUrl}/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(profileResponse.ok()).toBe(true);
  const originalProfile = await profileResponse.json();
  const updatedUsername = `e2e-${uniqueSuffix.slice(-12)}`;
  let profileChanged = false;

  try {
    await navigateWithinApp(page, '/account-settings');

    await page.locator('#formUsername').fill(updatedUsername);
    await page.locator('#formProfileCurrentPassword').fill(process.env.E2E_PASSWORD);
    await page.getByRole('button', { name: 'Save Profile Changes', exact: true }).click();
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith('/users')
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Save Changes', exact: true })
      .click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok(), `Profile update returned HTTP ${updateResponse.status()}`).toBe(
      true
    );
    expect((await updateResponse.json()).username).toBe(updatedUsername);
    profileChanged = true;
    await expect(page.locator('#formUsername')).toHaveValue(updatedUsername);

    await expect
      .poll(
        async () => {
          const updatedProfileResponse = await page.context().request.get(`${liveApiUrl}/users`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          expect(updatedProfileResponse.ok()).toBe(true);
          return (await updatedProfileResponse.json()).username;
        },
        { timeout: 5_000 }
      )
      .toBe(updatedUsername);
  } finally {
    if (profileChanged) {
      const restoreResponse = await page.context().request.patch(`${liveApiUrl}/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          username: originalProfile.username,
          email: originalProfile.email,
          current_password: process.env.E2E_PASSWORD,
        },
      });
      expect(
        restoreResponse.ok(),
        `Profile cleanup returned HTTP ${restoreResponse.status()}`
      ).toBe(true);
    }
  }
});
