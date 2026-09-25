import { test as base, expect } from '@playwright/test';

import { mockAuthApi, mockGuestSession, signIn } from './auth';

export const test = base.extend({
  page: async ({ page }, run) => {
    const pageErrors = [];
    const onPageError = (error) => pageErrors.push(error);
    page.on('pageerror', onPageError);

    await run(page);

    page.off('pageerror', onPageError);
    expect(pageErrors, 'The page emitted uncaught JavaScript errors').toEqual([]);
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
    await mockAuthApi(page, { role: 'admin' });
    await signIn(page);
    await run(page);
  },
});

export { expect };
