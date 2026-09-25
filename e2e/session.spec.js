import { test, expect } from './fixtures/test';
import { mockJson, mockSequence } from './fixtures/api';
import { createAccessToken } from './fixtures/auth';
import { openAdminList, openUserList } from './fixtures/navigation';
import { buildSubscription, buildUser } from './fixtures/data';

// Same identity and role as the token the fixture signed in with, but a
// different string, so an Authorization header assertion can tell the two
// apart. The role has to survive the refresh: AuthProvider re-derives it from
// the token, and an admin session that came back as a user would be bounced
// to /unauthorized.
const refreshedTokenFor = (role) => createAccessToken({ id: 'user-1', role, jti: 'refreshed' });

test('an expired access token is refreshed and the original request is replayed', async ({
  userPage: page,
}) => {
  const subscriptions = await mockSequence(page, {
    path: '/subscriptions',
    responses: [
      { status: 401, body: { detail: 'Access token expired' } },
      { status: 200, body: [buildSubscription()] },
    ],
  });
  const refresh = await mockSequence(page, {
    method: 'POST',
    path: '/auth/refresh-token',
    responses: [{ status: 200, body: { access_token: refreshedTokenFor('user') } }],
  });

  // The Authorization header is the only proof the replay picked up the new
  // token; the interceptor rewrites the original request's headers in place.
  const subscriptionAuthorizations = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/subscriptions')) {
      subscriptionAuthorizations.push(request.headers().authorization);
    }
  });

  await openUserList(page, 'Subscriptions');

  await expect(page.getByRole('cell', { name: 'Starter Plan' })).toBeVisible();
  expect(subscriptions.calls, 'the request was replayed exactly once').toBe(2);
  expect(refresh.calls, 'exactly one refresh was attempted').toBe(1);
  expect(subscriptionAuthorizations.at(-1)).toBe(`Bearer ${refreshedTokenFor('user')}`);
});

test('concurrent expired requests share a single refresh and all replay', async ({
  adminPage: page,
}) => {
  const profile = buildUser({ id: 'user-2', username: 'admin-user', role: 'admin' });

  await mockJson(page, {
    path: '/admin/users',
    body: { data: [profile], total_count: 1 },
  });

  // The user profile page fires four independent queries in one render pass,
  // which is exactly the shape that makes the client's failed-request queue
  // matter: all four 401 while a single refresh is still in flight.
  const endpoints = [
    { path: '/admin/users/user-2/profile', body: profile },
    { path: '/admin/vpn-devices/by-user/user-2', body: [] },
    { path: '/admin/subscriptions/by-user/user-2', body: [] },
    { path: '/admin/invoices/by-user/user-2', body: [] },
  ];

  const lists = await Promise.all(
    endpoints.map(({ path, body }) =>
      mockSequence(page, {
        path,
        responses: [
          { status: 401, body: { detail: 'Access token expired' } },
          { status: 200, body },
        ],
      })
    )
  );

  // Held open long enough for every sibling 401 to land in the queue. The boot
  // refresh already ran during sign-in, so this delay only ever applies to the
  // interceptor's refresh.
  const adminRefreshedToken = refreshedTokenFor('admin');
  const refresh = await mockSequence(page, {
    method: 'POST',
    path: '/auth/refresh-token',
    responses: [{ status: 200, body: { access_token: adminRefreshedToken }, delayMs: 500 }],
  });

  await openAdminList(page, '/admin/users');
  await page.getByRole('link', { name: 'admin-user' }).click();

  await expect(page.getByRole('heading', { name: 'User Profile' })).toBeVisible();
  expect(refresh.calls, 'the queued requests shared one refresh').toBe(1);
  lists.forEach((list, index) => {
    expect(list.calls, `${endpoints[index].path} replayed once`).toBe(2);
  });
});

test('a failed refresh clears the session and returns the user to the login page', async ({
  userPage: page,
}) => {
  await mockSequence(page, {
    path: '/subscriptions',
    responses: [{ status: 401, body: { detail: 'Session expired' } }],
  });
  const refresh = await mockSequence(page, {
    method: 'POST',
    path: '/auth/refresh-token',
    responses: [{ status: 401, body: { detail: 'No active session' } }],
  });

  await openUserList(page, 'Subscriptions');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  expect(refresh.calls).toBe(1);
});

test('a forbidden request surfaces the API error without refreshing the session', async ({
  userPage: page,
}) => {
  await mockSequence(page, {
    path: '/subscriptions',
    responses: [{ status: 403, body: { detail: 'Subscription access denied' } }],
  });
  const refresh = await mockSequence(page, {
    method: 'POST',
    path: '/auth/refresh-token',
    responses: [{ status: 200, body: { access_token: refreshedTokenFor('user') } }],
  });

  await openUserList(page, 'Subscriptions');

  await expect(page.getByText('Subscription access denied')).toBeVisible();
  // 403 is an authorization decision, not an expiry: refreshing here would
  // burn a refresh cookie rotation to learn nothing.
  expect(refresh.calls, 'a 403 must not trigger a refresh').toBe(0);
  await expect(page).toHaveURL(/\/subscriptions$/);
});
