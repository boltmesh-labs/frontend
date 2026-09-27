import { expect } from "@playwright/test";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getApiPathPattern = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBaseUrl = process.env.E2E_API_URL?.replace(/\/$/, "");

  if (configuredBaseUrl) {
    const url = new URL(configuredBaseUrl);
    const pathname = `${url.pathname.replace(/\/$/, "")}${normalizedPath}`;
    return new RegExp(`^${escapeRegExp(url.origin + pathname)}(?:\\?.*)?$`);
  }

  // The Vite app uses /v1 for its API by default. Matching the path rather
  // than the host keeps these mocks independent of the developer's .env file.
  return new RegExp(`/v1${escapeRegExp(normalizedPath)}(?:\\?.*)?$`);
};

const serializeBody = (body) =>
  typeof body === "string" ? body : JSON.stringify(body);

const toQueryObject = (url) =>
  Object.fromEntries(new URL(url).searchParams.entries());

/**
 * Registers one API route and asserts the method, query and body of every
 * matching request before fulfilling it. `resolveResponse(callIndex)` runs per
 * request and decides what gets fulfilled, which is what lets a single route
 * serve a *sequence* of responses (see `mockSequence`).
 *
 * Returns the array of query strings seen so far. Tests assert against it
 * after the fact to prove things a fulfilled stub cannot show on its own:
 * how many requests were made, and what parameters each one carried.
 */
const registerJsonRoute = async (page, config, resolveResponse) => {
  const { method = "GET", path, query, requestBody } = config;
  const seenQueries = [];

  await page.route(getApiPathPattern(path), async (route) => {
    const request = route.request();

    // Pages routinely read and write the same collection (GET /users then
    // PATCH /users). A mock must only claim the verb it declared, otherwise the
    // most recently registered one shadows every other handler for that path.
    if (request.method() !== method) {
      await route.fallback();
      return;
    }

    seenQueries.push(toQueryObject(request.url()));

    expect(
      request.method(),
      `Unexpected HTTP method for ${method} ${path}`,
    ).toBe(method);

    if (query) {
      expect(
        seenQueries.at(-1),
        `Unexpected query for ${method} ${path}`,
      ).toMatchObject(query);
    }

    if (requestBody !== undefined) {
      expect(
        request.postDataJSON(),
        `Unexpected request body for ${method} ${path}`,
      ).toMatchObject(requestBody);
    }

    const {
      status = 200,
      body = {},
      delayMs = 0,
    } = await resolveResponse(seenQueries.length - 1);

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: serializeBody(body),
    });
  });

  return seenQueries;
};

export const mockJson = async (page, config) => {
  const { status = 200, body = {}, delayMs = 0 } = config;

  await registerJsonRoute(page, config, () => ({ status, body, delayMs }));
};

/**
 * Like `mockJson`, but the response is picked per call from `responses` rather
 * than being fixed. The last entry repeats once the list is exhausted, so a
 * test can describe only the transition it cares about ("expired, then fine")
 * without spelling out the steady state that follows.
 *
 * Returns a live handle for asserting request behaviour the app chose, not the
 * stub: `calls` counts requests, `queries` exposes each one's parameters.
 *
 * A step may carry its own `query`/`requestBody` to pin what that particular
 * call must look like; steps that omit them fall back to the route-level
 * values, so an unfiltered first request can leave them unset entirely.
 */
export const mockSequence = async (page, { responses, ...config }) => {
  const seenQueries = await registerJsonRoute(page, config, (callIndex) => {
    const step = responses[Math.min(callIndex, responses.length - 1)];

    return {
      ...step,
      query: step.query ?? config.query,
      requestBody: step.requestBody ?? config.requestBody,
    };
  });

  return {
    get calls() {
      return seenQueries.length;
    },
    get queries() {
      return seenQueries;
    },
  };
};
