import { mockJson } from './api';
import { buildUser } from './data';

export const createAccessToken = ({ id, role }) => {
  const payload = Buffer.from(JSON.stringify({ sub: id, role })).toString('base64url');
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
    body: buildUser(),
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
