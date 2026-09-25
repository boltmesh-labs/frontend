import { test, expect } from './fixtures/test';
import { mockJson, mockSequence } from './fixtures/api';
import { allowSessionReload } from './fixtures/auth';
import { buildSubscription, buildUser } from './fixtures/data';

const subscription = buildSubscription();

test('a rate-limited request surfaces the throttle message', async ({ userPage: page }) => {
  await mockJson(page, {
    path: '/subscriptions',
    status: 429,
    body: { detail: 'Too many requests. Please slow down.' },
  });

  await page.locator('#main-content').getByRole('link', { name: 'Subscriptions' }).click();

  // The backend shares a small per-minute budget across login and writes, so
  // a throttled read is a routine condition, not an edge case.
  await expect(page.getByText('Too many requests. Please slow down.')).toBeVisible();
  await expect(page).toHaveURL(/\/subscriptions$/);
});

test('a failed list request can be retried from the error banner', async ({ userPage: page }) => {
  const subscriptions = await mockSequence(page, {
    path: '/subscriptions',
    responses: [{ status: 500, body: { detail: 'Subscription service unavailable' } }],
  });

  await page.locator('#main-content').getByRole('link', { name: 'Subscriptions' }).click();
  await expect(page.getByText('Subscription service unavailable')).toBeVisible();

  // Retry re-runs the query; the same failing endpoint answers again, which is
  // what proves the button re-issues the request instead of just re-rendering.
  const before = subscriptions.calls;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect.poll(() => subscriptions.calls).toBeGreaterThan(before);
});

test('a session that dies mid-page returns the user to login', async ({ userPage: page }) => {
  await mockJson(page, { path: '/subscriptions', body: [subscription] });
  // The refresh cookie is gone server-side, so the silent refresh that would
  // normally rescue an expired access token now fails.
  await mockJson(page, {
    method: 'POST',
    path: '/auth/refresh-token',
    status: 401,
    body: { detail: 'Session revoked' },
  });

  await page.locator('#main-content').getByRole('link', { name: 'Subscriptions' }).click();
  await expect(page.getByRole('heading', { name: 'Subscriptions' })).toBeVisible();

  await page.locator('nav').getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();

  // Any API call now discovers the refresh token is dead.
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test('an unknown invoice id renders a controlled dead end', async ({ userPage: page }) => {
  await mockJson(page, { path: '/users', body: buildUser() });
  await mockJson(page, {
    path: '/invoices/missing-invoice',
    status: 404,
    body: { detail: 'Invoice not found or no longer accessible' },
  });

  // Reaching the page by deep link is the realistic way someone lands on an id
  // that no longer exists, so the reload is deliberate here.
  await allowSessionReload(page);
  await page.goto('/invoices/missing-invoice');

  // DetailShell swaps the whole page for a retryable alert, so there is no
  // invoice content to show.
  await expect(page.getByText('Invoice not found or no longer accessible')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('a signed-in user hitting an unknown route gets the in-app 404, not a login bounce', async ({
  userPage: page,
}) => {
  await allowSessionReload(page);
  await page.goto('/nope');

  // Guests are redirected to login on unknown URLs; an authenticated session
  // must be able to tell "typo" apart from "signed out".
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page).toHaveURL(/\/nope$/);
});
