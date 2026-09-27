import { test, expect } from "./fixtures/test";
import { mockJson, mockSequence } from "./fixtures/api";
import { buildUser } from "./fixtures/data";

// The callback never accepts a credential from the URL: the backend establishes
// the session with an HttpOnly cookie and the SPA performs a silent refresh.
const mockOAuthSession = (page, accessToken) => {
  // Registered after the guest fixture's 401, so this one wins.
  return mockSequence(page, {
    method: "POST",
    path: "/auth/refresh-token",
    responses: [{ status: 200, body: { access_token: accessToken } }],
  });
};

// A synthetic JWT: the payload decodes to {"sub":"user-1","role":"user"} and
// the signature is the literal word "signature". gitleaks' generic-api-key
// rule matches on the three-part dot shape, so this needs an explicit allow.
const userToken = "header.eyJzdWIiOiJ1c2VyLTEiLCJyb2xlIjoidXNlciJ9.signature"; // gitleaks:allow

test("the OAuth callback establishes the session from the refresh cookie", async ({
  guestPage: page,
}) => {
  await mockOAuthSession(page, userToken);
  await mockJson(page, { path: "/users", body: buildUser() });

  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Account Dashboard" }),
  ).toBeVisible();
});

test("the OAuth callback surfaces a provider error", async ({
  guestPage: page,
}) => {
  await page.goto("/auth/callback?error=access_denied");

  await expect(page.getByRole("alert")).toHaveText("access_denied");
  await expect(page).toHaveURL(/\/auth\/callback/);

  await page.getByRole("button", { name: "Return to Login" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("the OAuth callback fails closed when the session cookie is missing", async ({
  guestPage: page,
}) => {
  // The guest fixture already answers the refresh with 401.
  await page.goto("/auth/callback");

  await expect(page.getByRole("alert")).toHaveText(
    "Authentication failed. No access token was received.",
  );
  await expect(page).not.toHaveURL(/\/dashboard/);
});

test("the OAuth callback ignores a token passed in the URL", async ({
  guestPage: page,
}) => {
  await mockOAuthSession(page, userToken);
  await mockJson(page, { path: "/users", body: buildUser() });

  // A leaked ?token= must not become the session; only the cookie can.
  await page.goto("/auth/callback?token=attacker-supplied");

  await expect(page).toHaveURL(/\/dashboard$/);
  // The query string is scrubbed so the value cannot leak via Referer/history.
  expect(page.url()).not.toContain("token=");
});

test("a hostile post-login redirect target falls back to the dashboard", async ({
  guestPage: page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("oauth_redirect_from", "//evil.example.com/steal");
  });
  await mockOAuthSession(page, userToken);
  await mockJson(page, { path: "/users", body: buildUser() });

  await page.goto("/auth/callback");

  // sanitizeRedirectPath rejects protocol-relative URLs, so the session lands
  // in-app instead of being handed to an attacker.
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(page.url()).not.toContain("evil.example.com");
});

test("a legitimate post-login redirect target is honoured", async ({
  guestPage: page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("oauth_redirect_from", "/account-settings");
  });
  await mockOAuthSession(page, userToken);
  await mockJson(page, { path: "/users", body: buildUser() });

  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/account-settings$/);
});

const captureProviderHandoff = async (page) => {
  const handoffs = [];
  await page.route(/\/auth\/(google|github)\?/, async (route) => {
    handoffs.push(route.request().url());
    // The provider is a cross-origin redirect we deliberately never follow.
    await route.abort();
  });
  return handoffs;
};

test("the social buttons hand off to the provider with the current remember-me choice", async ({
  guestPage: page,
}) => {
  const handoffs = await captureProviderHandoff(page);

  await page.goto("/login");
  await page
    .locator("#main-content")
    .getByRole("button", { name: "Google" })
    .click();

  await expect
    .poll(() => handoffs.length, "the browser attempted the provider redirect")
    .toBe(1);
  expect(handoffs[0]).toContain("/auth/google?remember_me=false");
});

test("ticking remember me is forwarded to the provider and to password login", async ({
  guestPage: page,
}) => {
  const handoffs = await captureProviderHandoff(page);

  await page.goto("/login");
  await page.locator("#remember-me").check();
  await page
    .locator("#main-content")
    .getByRole("button", { name: "GitHub" })
    .click();

  await expect.poll(() => handoffs.length).toBe(1);
  expect(handoffs[0]).toContain("/auth/github?remember_me=true");
});

test("the provider handoff round-trips back to the page the user wanted", async ({
  guestPage: page,
}) => {
  const handoffs = await captureProviderHandoff(page);

  // Land on the login page via a protected route so the intended destination
  // is carried in router state. The boot refresh still fails at this point, so
  // the session really is a guest one.
  await page.goto("/devices");
  await expect(page).toHaveURL(/\/login$/);

  await page
    .locator("#main-content")
    .getByRole("button", { name: "Google" })
    .click();
  await expect.poll(() => handoffs.length).toBe(1);

  // The provider has returned the user. Registering the session only now keeps
  // the guest boot refresh above intact.
  await mockOAuthSession(page, userToken);
  await mockJson(page, { path: "/users", body: buildUser() });
  // The resumed page is a real one, so everything it loads has to answer.
  await mockJson(page, { path: "/subscriptions", body: [] });
  await mockJson(page, { path: "/vpn-devices", body: [] });

  // Aborting the provider redirect leaves the tab on an error page, so come
  // back to the app first. sessionStorage is per-tab, so the destination Login
  // wrote before the handoff is still there.
  await page.goto("/auth/callback");

  // The whole point of persisting the destination: the user resumes where they
  // were headed instead of always landing on the dashboard.
  await expect(page).toHaveURL(/\/devices$/);
  await expect(
    page.getByRole("heading", { name: "VPN Devices" }),
  ).toBeVisible();
});
