import { test, expect } from "./fixtures/test";
import { mockJson } from "./fixtures/api";
import { buildInvoice, buildPlan } from "./fixtures/data";

const plan = buildPlan();
import { buildUser } from "./fixtures/data";

const adminUser = buildUser({
  id: "user-2",
  username: "admin-user",
  role: "admin",
});

test("mobile navigation can be opened from the login page", async ({
  guestPage: page,
}) => {
  await page.goto("/login");

  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator("#navbar-nav")).toHaveClass(/show/);
});

test("mobile navigation reaches the dashboard and collapses again", async ({
  userPage: page,
}) => {
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await expect(toggle).toBeVisible();
  await toggle.click();

  await page
    .locator("#navbar-nav")
    .getByRole("link", { name: "Dashboard" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Account Dashboard" }),
  ).toBeVisible();
  // The drawer is not a modal, so it must not stay open over the page the user
  // just navigated to.
  await expect(page.locator("#navbar-nav")).not.toHaveClass(/show/);
});

test("the admin area is reachable and navigable on a phone", async ({
  adminPage: page,
}) => {
  await mockJson(page, {
    path: "/admin/users",
    body: { data: [adminUser], total_count: 1 },
  });

  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await toggle.click();
  await page
    .locator("#navbar-nav")
    .getByRole("link", { name: "Admin Panel" })
    .click();

  await expect(
    page.getByRole("heading", { name: "User Accounts" }),
  ).toBeVisible();
  // The admin sidebar is a stacked column below md, not a collapsed drawer.
  await expect(page.getByRole("link", { name: "VPN Servers" })).toBeVisible();
  await mockJson(page, {
    path: "/admin/vpn-servers",
    body: { data: [], total_count: 0 },
  });
  await page.getByRole("link", { name: "VPN Servers" }).click();

  await expect(
    page.getByRole("heading", { name: "VPN Server Management" }),
  ).toBeVisible();
});

test("the admin table stays usable on a phone", async ({ adminPage: page }) => {
  await mockJson(page, {
    path: "/admin/users",
    body: { data: [adminUser], total_count: 1 },
  });

  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .locator("#navbar-nav")
    .getByRole("link", { name: "Admin Panel" })
    .click();
  await expect(
    page.getByRole("heading", { name: "User Accounts" }),
  ).toBeVisible();

  await expect(
    page.getByRole("columnheader", { name: "Access State" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Deactivate account for admin-user" }),
  ).toBeVisible();
});

test("a user table with a card fallback hides its columns on a phone", async ({
  userPage: page,
}) => {
  const invoice = buildInvoice({ plan, status: "pending" });
  await mockJson(page, {
    path: "/invoices",
    body: { data: [invoice], total_count: 1 },
  });
  await mockJson(page, { path: "/plans", body: [plan] });

  await page
    .locator("#main-content")
    .getByRole("link", { name: "Billing & Invoices" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Invoices & Billing" }),
  ).toBeVisible();

  // The desktop table is hidden below md and replaced by per-record cards, so a
  // row stays readable instead of forcing a horizontal scroll.
  await expect(
    page.getByRole("columnheader", { name: "Payment Method" }),
  ).toBeHidden();
  await expect(
    page.getByRole("link", { name: invoice.id }).first(),
  ).toBeVisible();
  await expect(page.getByText("Lightning").first()).toBeVisible();
});

test("the user dashboard stays readable on a phone", async ({
  userPage: page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Account Dashboard" }),
  ).toBeVisible();

  // Quick-nav cards stack rather than overflow on a narrow viewport.
  await page
    .locator("#main-content")
    .getByRole("link", { name: "Account Settings" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account Settings" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Delete Account/ })).toBeVisible();
});
