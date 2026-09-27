import { test as base, expect } from "@playwright/test";

import { mockAuthApi, mockGuestSession, signIn } from "./auth";

// Any request to the versioned API that no mock claimed. Registered first in
// the page fixture so it is the *last* handler consulted, which makes it the
// fallback for every other route.
const API_PATH_PATTERN = /\/v1\//;

export const test = base.extend({
  page: async ({ page }, run) => {
    const pageErrors = [];
    const unmockedApi = [];
    const onPageError = (error) => pageErrors.push(error);
    page.on("pageerror", onPageError);

    // Without this, a page that loads an endpoint the spec forgot to mock
    // reaches a real API. The 401 it gets back is indistinguishable from an
    // expired session, so the client refreshes, fails, and logs the user out
    // partway through the test — a failure that points at the wrong thing.
    // Recording the request instead lets the test say which endpoint is
    // missing.
    await page.route(API_PATH_PATTERN, async (route) => {
      const request = route.request();
      unmockedApi.push(
        `${request.method()} ${new URL(request.url()).pathname}`,
      );
      await route.fallback();
    });

    await run(page);

    page.off("pageerror", onPageError);
    expect(pageErrors, "The page emitted uncaught JavaScript errors").toEqual(
      [],
    );
    expect(
      [...new Set(unmockedApi)],
      "API requests made without a matching mock",
    ).toEqual([]);
  },

  guestPage: async ({ page }, run) => {
    await mockGuestSession(page);
    await run(page);
  },

  userPage: async ({ page }, run) => {
    await mockAuthApi(page);
    await signIn(page);
    await run(page);
  },

  adminPage: async ({ page }, run) => {
    await mockAuthApi(page, { role: "admin" });
    await signIn(page);
    await run(page);
  },
});

export { expect };
