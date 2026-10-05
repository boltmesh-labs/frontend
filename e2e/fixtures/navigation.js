import { expect } from "@playwright/test";

/**
 * In-app navigation helpers for authenticated specs.
 *
 * An authenticated test must NOT use `page.goto()` to reach a protected route.
 * A full page load restarts the SPA, which re-runs AuthProvider's silent boot
 * refresh against the guest (401) mock and bounces an already signed-in
 * session straight back to /login — the test then fails on a missing heading
 * that has nothing to do with what it was checking. Clicking the app's own
 * links keeps the in-memory session alive, which is also the realistic path a
 * user takes.
 */

export const ADMIN_SIDEBAR_LINKS = {
  "/admin/users": "Users",
  "/admin/plans": "Plans",
  "/admin/subscriptions": "Subscriptions",
  "/admin/invoices": "Invoices",
  "/admin/payments": "Payments & Transactions",
  "/admin/vpn-regions": "VPN Regions",
  "/admin/vpn-servers": "VPN Servers",
  "/admin/vpn-devices": "VPN Devices",
};

/** Reaches the admin area, then the sidebar entry that matches `route`. */
export const openAdminList = async (page, route) => {
  const target = new RegExp(`${route}$`);
  const isInAdmin = () => /\/admin\//.test(page.url());

  if (!target.test(page.url())) {
    if (!isInAdmin()) {
      // Entering /admin lands on the users list, so the sidebar click below
      // still has to run to reach the actual target.
      await page
        .locator("nav")
        .getByRole("link", { name: "Admin Panel" })
        .click();
      await page.waitForURL(/\/admin\//);
      // The sidebar is part of the admin layout and arrives one Suspense tick
      // after the URL does. Clicking before it settles races React's own
      // re-render and the click lands on a detached node.
      await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    }

    if (!target.test(page.url())) {
      // Sidebar entries render an icon span next to their label, so the
      // accessible name is "👤 Users" — match on a substring, not exactly.
      await page
        .getByRole("link", { name: ADMIN_SIDEBAR_LINKS[route] })
        .click();
    }
  }

  await page.waitForURL(target);
};

/**
 * The VpnServer registration audit log is not a sidebar entry — it hangs off the
 * VPN server list, so reaching it takes two clicks.
 */
export const openAdminAuditLog = async (page) => {
  await openAdminList(page, "/admin/vpn-servers");
  // react-bootstrap's Button renders this nav control with role="button" even
  // though it navigates, so it is not reachable as a link.
  await page.getByRole("button", { name: "Audit Logs" }).click();
  await page.waitForURL(/\/admin\/vpn-servers\/audit$/);
};

/** Reaches a dashboard quick-nav card, e.g. openUserList(page, 'Subscriptions'). */
export const openUserList = async (page, cardName) => {
  await page
    .locator("#main-content")
    .getByRole("link", { name: cardName })
    .first()
    .click();
};
