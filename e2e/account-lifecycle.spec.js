import { test, expect } from './fixtures/test';
import { mockJson } from './fixtures/api';
import { buildUser } from './fixtures/data';

// Both token-consuming pages run on mount and then wait ~2.5s before
// redirecting, so each test has to mock whatever the *destination* loads or
// the app follows a real request, gets a 401, and logs the user out instead.
const mockDashboard = (page) => mockJson(page, { path: '/users', body: buildUser() });

test('an activation link verifies the account and signs the user in', async ({
  guestPage: page,
}) => {
  const accessToken = 'header.eyJzdWIiOiJ1c2VyLTEiLCJyb2xlIjoidXNlciJ9.signature';
  await mockJson(page, {
    method: 'POST',
    path: '/auth/verify-email',
    requestBody: { token: 'good-token' },
    body: { access_token: accessToken },
  });
  await mockDashboard(page);

  await page.goto('/verify-email?token=good-token');

  await expect(page.getByRole('alert')).toContainText('Account activated');
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 6000 });
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
});

test('an already activated account is told the link was already used', async ({
  guestPage: page,
}) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/verify-email',
    status: 409,
    body: { detail: 'Account already active' },
  });
  await mockDashboard(page);

  await page.goto('/verify-email?token=good-token');

  await expect(page.getByRole('alert')).toContainText('already activated');
});

test('an invalid activation link reports why it failed', async ({ guestPage: page }) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/verify-email',
    status: 400,
    body: { detail: 'Verification token has expired' },
  });
  await mockDashboard(page);

  await page.goto('/verify-email?token=stale-token');

  await expect(page.getByRole('alert')).toContainText('Verification token has expired');
});

test('an activation link with no token is rejected without calling the API', async ({
  guestPage: page,
}) => {
  await page.goto('/verify-email');

  // Tokenless links are the common case here: a mail client that strips the
  // query string must not turn into a verification attempt.
  await expect(page.getByRole('alert')).toContainText('verification token is missing');
});

test('a deletion confirmation link deletes the account and signs out', async ({
  guestPage: page,
}) => {
  await mockJson(page, {
    method: 'POST',
    path: '/users/delete-confirm',
    requestBody: { token: 'delete-token' },
    body: {},
  });

  await page.goto('/confirm-delete?token=delete-token');

  await expect(page.getByRole('alert')).toContainText('Your account has been deleted');
  await expect(page).toHaveURL(/\/login$/, { timeout: 6000 });
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('an expired deletion link surfaces the backend reason', async ({ guestPage: page }) => {
  await mockJson(page, {
    method: 'POST',
    path: '/users/delete-confirm',
    status: 400,
    body: { detail: 'This confirmation link has expired' },
  });

  await page.goto('/confirm-delete?token=stale-token');

  // The page keeps the user on the dead end rather than bouncing to login, so
  // the reason stays readable.
  await expect(page.getByRole('alert')).toContainText('This confirmation link has expired');
  await expect(page).toHaveURL(/\/confirm-delete/);
});

test('a deletion link with no token is rejected without calling the API', async ({
  guestPage: page,
}) => {
  await page.goto('/confirm-delete');

  await expect(page.getByRole('alert')).toContainText('token is missing');
});
