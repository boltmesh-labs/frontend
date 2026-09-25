import { mockJson } from './api';
import { buildUser } from './data';

// Extra claims are passed straight into the payload so a test can mint a token
// that is a *different string* while decoding to the same identity. That is
// what makes "the replayed request carried the refreshed token" a real
// assertion — a re-encoded identical token would pass either way.
export const createAccessToken = ({ id, role, ...claims }) => {
  const payload = Buffer.from(JSON.stringify({ sub: id, role, ...claims })).toString('base64url');
  return `header.${payload}.signature`;
};

export const mockGuestSession = async (page) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/refresh-token',
    status: 401,
    body: { detail: 'No active session' },
  });
};

export const mockAuthApi = async (page, { role = 'user' } = {}) => {
  const accessToken = createAccessToken({ id: 'user-1', role });

  await mockGuestSession(page);
  await mockJson(page, {
    method: 'POST',
    path: '/auth/login',
    body: { access_token: accessToken },
  });
  await mockJson(page, {
    path: '/users',
    body: buildUser({ role }),
  });
  await mockJson(page, {
    method: 'POST',
    path: '/auth/logout',
    body: {},
  });
};

export const mockRestoredAuthApi = async (page, { role = 'user' } = {}) => {
  const accessToken = createAccessToken({ id: 'user-1', role });

  await mockJson(page, {
    method: 'POST',
    path: '/auth/refresh-token',
    body: { access_token: accessToken },
  });
  await mockJson(page, {
    path: '/users',
    body: buildUser({ role }),
  });
  await mockJson(page, {
    method: 'POST',
    path: '/auth/logout',
    body: {},
  });
};

export const signIn = async (page) => {
  await page.goto('/login');
  await page.locator('#username').fill('test-user');
  await page.locator('#password').fill('test-password');
  await page.locator('#main-content').getByRole('button', { name: 'Login', exact: true }).click();
};
