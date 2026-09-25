import { test as base, expect } from '@playwright/test';

// The live specs talk to a real API on purpose, so the mocked suite's
// unmocked-request guard (see ./test.js) does not apply to them: every request
// they make is deliberately unclaimed by a mock. The uncaught-error check is
// kept, since it catches real client bugs no matter where the data came from.
export const test = base.extend({
  page: async ({ page }, run) => {
    const pageErrors = [];
    const onPageError = (error) => pageErrors.push(error);
    page.on('pageerror', onPageError);

    await run(page);

    page.off('pageerror', onPageError);
    expect(pageErrors, 'The page emitted uncaught JavaScript errors').toEqual([]);
  },
});

export { expect };
