import { expect } from '@playwright/test';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getApiPathPattern = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredBaseUrl = process.env.E2E_API_URL?.replace(/\/$/, '');

  if (configuredBaseUrl) {
    const url = new URL(configuredBaseUrl);
    const pathname = `${url.pathname.replace(/\/$/, '')}${normalizedPath}`;
    return new RegExp(`^${escapeRegExp(url.origin + pathname)}(?:\\?.*)?$`);
  }

  // The Vite app uses /v1 for its API by default. Matching the path rather
  // than the host keeps these mocks independent of the developer's .env file.
  return new RegExp(`/v1${escapeRegExp(normalizedPath)}(?:\\?.*)?$`);
};

const serializeBody = (body) => (typeof body === 'string' ? body : JSON.stringify(body));

export const mockJson = async (
  page,
  { method = 'GET', path, query, requestBody, status = 200, body = {}, delayMs = 0 }
) => {
  await page.route(getApiPathPattern(path), async (route) => {
    const request = route.request();

    expect(request.method(), `Unexpected HTTP method for ${method} ${path}`).toBe(method);

    if (query) {
      const actualQuery = Object.fromEntries(new URL(request.url()).searchParams.entries());
      expect(actualQuery, `Unexpected query for ${method} ${path}`).toMatchObject(query);
    }

    if (requestBody !== undefined) {
      expect(request.postDataJSON(), `Unexpected request body for ${method} ${path}`).toMatchObject(
        requestBody
      );
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: serializeBody(body),
    });
  });
};
