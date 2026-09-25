export const createAccessToken = ({ id, role }) => {
  const payload = Buffer.from(JSON.stringify({ sub: id, role })).toString('base64url');
  return `header.${payload}.signature`;
};

export const mockAuthApi = async (page, { role = 'user' } = {}) => {
  const accessToken = createAccessToken({ id: 'user-1', role });

  await page.route('**/auth/refresh-token', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'No active session' }),
    });
  });

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: accessToken }),
    });
  });

  await page.route('**/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'test-user',
        email: 'test@example.com',
        is_verified: true,
        active_subscription: null,
      }),
    });
  });

  await page.route('**/auth/logout', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
};

export const signIn = async (page) => {
  await page.goto('/login');
  await page.locator('#username').fill('test-user');
  await page.locator('#password').fill('test-password');
  await page.locator('#main-content').getByRole('button', { name: 'Login', exact: true }).click();
};
