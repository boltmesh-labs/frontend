import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { test as base, expect } from "@playwright/test";

// The live specs talk to a real API on purpose, so the mocked suite's
// unmocked-request guard (see ./test.js) does not apply to them: every request
// they make is deliberately unclaimed by a mock. The uncaught-error check is
// kept, since it catches real client bugs no matter where the data came from.
export const test = base.extend({
  page: async ({ page }, run) => {
    const pageErrors = [];
    const onPageError = (error) => pageErrors.push(error);
    page.on("pageerror", onPageError);

    await run(page);

    page.off("pageerror", onPageError);
    expect(pageErrors, "The page emitted uncaught JavaScript errors").toEqual(
      [],
    );
  },
});

// The backend caps /auth/login at 10 requests per minute per IP
// (app/composition/lifespan.py, strict_limiter), and this suite signs in
// ~15 times per run, so logins eventually earn a 429 and the app renders
// "Rate limit exceeded" instead of a session. Sleeping here keeps the suite
// under the cap without weakening any test's real sign-in.
//
// The window lives in Redis, so it outlives this process: the ledger is kept in
// a temp file rather than in memory, otherwise a second run started right after
// the first sees an empty ledger and walks straight into the limit the previous
// run had already consumed. The file is keyed by API URL so distinct targets
// keep independent budgets.
const LOGIN_LIMIT_PER_MINUTE = 9;
const WINDOW_MS = 60_000;
const LEDGER_PATH = join(
  tmpdir(),
  `boltmesh-e2e-logins-${createHash("sha256")
    .update(process.env.E2E_API_URL || "default")
    .digest("hex")
    .slice(0, 12)}.json`,
);

const readLedger = () => {
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    return [];
  }
};

export const throttleLogin = async () => {
  let now = Date.now();
  let timestamps = readLedger().filter((time) => now - time < WINDOW_MS);

  if (timestamps.length >= LOGIN_LIMIT_PER_MINUTE) {
    const waitMs = WINDOW_MS - (now - timestamps[0]) + 1000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    now = Date.now();
    timestamps = timestamps.filter((time) => now - time < WINDOW_MS);
  }

  timestamps.push(now);
  writeFileSync(LEDGER_PATH, JSON.stringify(timestamps));
};

export { expect };
