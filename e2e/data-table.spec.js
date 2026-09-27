import { test, expect } from "./fixtures/test";
import { mockJson, mockSequence } from "./fixtures/api";
import { openAdminAuditLog, openAdminList } from "./fixtures/navigation";
import { buildUser } from "./fixtures/data";

const adminUser = buildUser({
  id: "user-2",
  username: "admin-user",
  email: "admin-user@example.com",
  role: "admin",
});

const emptyPage = { data: [], total_count: 0 };
const aPageOfUsers = { data: [adminUser], total_count: 25 };

/**
 * The admin area always lands on the users list, so every test passes through
 * it. It has to be mocked even when a test does not care about users: with an
 * API on E2E_API_URL an unmocked request comes back 401, which the client
 * reads as an expired session and turns into a logout mid-test.
 *
 * Register it before any test-specific mock of the same path: Playwright
 * resolves overlapping routes last-registered-first, so the test's own mock
 * has to come second to win.
 */
const mockAdminLanding = (page) =>
  mockJson(page, {
    path: "/admin/users",
    body: { data: [adminUser], total_count: 1 },
  });

/**
 * Every admin list driven by `useTableQuery`. `pageSize` is per page because
 * `useTableQuery` takes it as an option and the region and audit lists ask for
 * 20 rows instead of the 10 the rest share. `apiPath` is the API collection
 * and `route` the URL it hangs off — they diverge for the node-registration
 * audit log, which is browsable at /admin/vpn-servers/audit but served from
 * /admin/audit/node-registration-logs. Plans are deliberately absent: they are
 * the one admin list with no search, filters or pagination.
 */
const ADMIN_LISTS = [
  {
    route: "/admin/users",
    apiPath: "/admin/users",
    heading: "User Accounts",
    pageSize: 10,
  },
  {
    route: "/admin/subscriptions",
    apiPath: "/admin/subscriptions",
    heading: "Subscription Management",
    pageSize: 10,
  },
  {
    route: "/admin/invoices",
    apiPath: "/admin/invoices",
    heading: "Invoices",
    pageSize: 10,
    // The invoice list joins each row to its plan, so it fetches /admin/plans
    // alongside its own collection. Left unmocked that becomes a 401 and the
    // client logs the admin out mid-test.
    companionPaths: ["/admin/plans"],
  },
  {
    route: "/admin/payments",
    apiPath: "/admin/payments",
    heading: "Payments Management",
    pageSize: 10,
  },
  {
    route: "/admin/vpn-regions",
    apiPath: "/admin/vpn-regions",
    heading: "VPN Region Management",
    pageSize: 20,
  },
  {
    route: "/admin/vpn-servers",
    apiPath: "/admin/vpn-servers",
    heading: "VPN Server Management",
    pageSize: 10,
  },
  {
    route: "/admin/vpn-devices",
    apiPath: "/admin/vpn-devices",
    heading: "VPN Devices",
    pageSize: 10,
  },
  {
    route: "/admin/vpn-servers/audit",
    apiPath: "/admin/audit/node-registration-logs",
    heading: "Node Registration Audit",
    pageSize: 20,
  },
];

const pageSizeFor = (route) =>
  ADMIN_LISTS.find((list) => list.route === route).pageSize;
const headingFor = (route) =>
  ADMIN_LISTS.find((list) => list.route === route).heading;

const mockCompanions = (page, route) =>
  Promise.all(
    (ADMIN_LISTS.find((list) => list.route === route).companionPaths ?? []).map(
      (path) => mockJson(page, { path, body: [] }),
    ),
  );

/**
 * One case per distinct param-mapping mechanism rather than one per select.
 * `useTableQuery` renames the param via `paramKey`, coerces the value via
 * `paramValue`, or passes both straight through — these cover all three.
 */
const FILTER_CASES = [
  {
    route: "/admin/users",
    apiPath: "/admin/users",
    filter: "Filter by user role",
    value: "admin",
    expected: { role: "admin" },
  },
  {
    // 'true'/'false' strings become a real boolean for the users endpoint.
    route: "/admin/users",
    apiPath: "/admin/users",
    filter: "Filter by user status",
    value: "true",
    expected: { is_active: "true" },
  },
  {
    route: "/admin/subscriptions",
    apiPath: "/admin/subscriptions",
    filter: "Filter by subscription status",
    value: "past_due",
    expected: { subscription_status: "past_due" },
  },
  {
    route: "/admin/invoices",
    apiPath: "/admin/invoices",
    filter: "Filter by status",
    value: "refund_required",
    expected: { invoice_status: "refund_required" },
  },
  {
    route: "/admin/invoices",
    apiPath: "/admin/invoices",
    filter: "Filter by payment method",
    value: "monero",
    expected: { payment_method: "monero" },
  },
  {
    route: "/admin/payments",
    apiPath: "/admin/payments",
    filter: "Filter by status",
    value: "succeeded",
    expected: { payment_status: "succeeded" },
  },
  {
    // Regions select on an 'active'/'inactive' vocabulary but send a boolean.
    route: "/admin/vpn-regions",
    apiPath: "/admin/vpn-regions",
    filter: "Filter by region active status",
    value: "inactive",
    expected: { is_active: "false" },
  },
  {
    route: "/admin/vpn-servers",
    apiPath: "/admin/vpn-servers",
    filter: "Filter by server status",
    value: "maintenance",
    expected: { status: "maintenance" },
  },
  {
    route: "/admin/vpn-servers",
    apiPath: "/admin/vpn-servers",
    filter: "Filter by server operating system",
    value: "debian",
    expected: { os: "debian" },
  },
  {
    route: "/admin/vpn-devices",
    apiPath: "/admin/vpn-devices",
    filter: "Filter by active status",
    value: "false",
    expected: { is_active: "false" },
  },
  {
    route: "/admin/vpn-servers/audit",
    apiPath: "/admin/audit/node-registration-logs",
    filter: "Filter by registration status",
    value: "TUNNEL_ADDRESS_OVERLAP",
    expected: { status: "TUNNEL_ADDRESS_OVERLAP" },
  },
];

const openList = async (page, route) => {
  if (route === "/admin/vpn-servers/audit") {
    // Reaching the audit log means passing through the server list, so its
    // endpoint has to answer too or the "Audit Logs" link never renders.
    await mockJson(page, { path: "/admin/vpn-servers", body: emptyPage });
    await openAdminAuditLog(page);
    return;
  }
  await openAdminList(page, route);
};

for (const list of ADMIN_LISTS) {
  test(`${list.heading} requests its configured first page`, async ({
    adminPage: page,
  }) => {
    await mockAdminLanding(page);
    await mockCompanions(page, list.route);
    await mockJson(page, {
      path: list.apiPath,
      query: { skip: "0", limit: String(list.pageSize) },
      body: emptyPage,
    });

    await openList(page, list.route);

    await expect(
      page.getByRole("heading", { name: list.heading }),
    ).toBeVisible();
  });
}

for (const filterCase of FILTER_CASES) {
  const [param, value] = Object.entries(filterCase.expected)[0];

  test(`${filterCase.filter} queries ${param}=${value}`, async ({
    adminPage: page,
  }) => {
    await mockAdminLanding(page);
    await mockCompanions(page, filterCase.route);
    const list = await mockSequence(page, {
      path: filterCase.apiPath,
      responses: [
        { body: emptyPage },
        {
          query: {
            ...filterCase.expected,
            skip: "0",
            limit: String(pageSizeFor(filterCase.route)),
          },
          body: emptyPage,
        },
      ],
    });

    await openList(page, filterCase.route);
    // Admin panes load lazily, so confirm the page finished rendering before
    // reaching for a filter that may still be swapped out from under us.
    await expect(
      page.getByRole("heading", { name: headingFor(filterCase.route) }),
    ).toBeVisible();
    await page.getByLabel(filterCase.filter).selectOption(filterCase.value);

    await expect
      .poll(() => list.calls, "the filter triggered one refetch")
      .toBe(2);
    expect(list.queries.at(-1)).toMatchObject(filterCase.expected);
    expect(list.queries.at(-1)).toMatchObject({
      skip: "0",
      limit: String(pageSizeFor(filterCase.route)),
    });
  });
}

test("Subscription Plans renders the shared table without list controls", async ({
  adminPage: page,
}) => {
  await mockAdminLanding(page);
  await mockJson(page, { path: "/admin/plans", body: emptyPage });

  await openAdminList(page, "/admin/plans");

  await expect(
    page.getByRole("heading", { name: "Subscription Plans" }),
  ).toBeVisible();
  // Plans are the one admin list with no search, filters or pagination: the
  // whole catalogue renders at once and rows are edited in place.
  await expect(
    page.getByRole("searchbox", { name: "Search table" }),
  ).toHaveCount(0);
  await expect(page.getByText("No subscription plans found.")).toBeVisible();
});

test("admin search waits out the debounce before querying the API", async ({
  adminPage: page,
}) => {
  const users = await mockSequence(page, {
    path: "/admin/users",
    responses: [{ body: emptyPage }],
  });

  await openAdminList(page, "/admin/users");
  await expect(
    page.getByRole("heading", { name: "User Accounts" }),
  ).toBeVisible();
  expect(users.calls, "only the mount query has run").toBe(1);

  const search = page.getByRole("searchbox", { name: "Search table" });
  await search.fill("ali");
  await search.fill("alice");

  // Shorter than the 400ms debounce, so a per-keystroke request would already
  // have been counted here.
  await page.waitForTimeout(200);
  expect(users.calls, "intermediate keystrokes are not queried").toBe(1);

  await expect
    .poll(() => users.calls, "one debounced search query ran")
    .toBe(2);
  expect(users.queries.at(-1)).toEqual({
    skip: "0",
    limit: "10",
    search: "alice",
  });
});

test("a new search returns to the first page", async ({ adminPage: page }) => {
  const users = await mockSequence(page, {
    path: "/admin/users",
    responses: [{ body: aPageOfUsers }],
  });

  await openAdminList(page, "/admin/users");
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect.poll(() => users.queries.at(-1)?.skip).toBe("10");

  await page.getByRole("searchbox", { name: "Search table" }).fill("alice");

  await expect
    .poll(() => users.queries.at(-1))
    .toEqual({ skip: "0", limit: "10", search: "alice" });
});

test("admin pagination requests the selected page and summarises the range", async ({
  adminPage: page,
}) => {
  const users = await mockSequence(page, {
    path: "/admin/users",
    responses: [{ body: aPageOfUsers }],
  });

  await openAdminList(page, "/admin/users");

  await expect(page.getByText("Showing 1–10 of 25")).toBeVisible();

  await page.getByRole("button", { name: "2", exact: true }).click();

  await expect(page.getByText("Showing 11–20 of 25")).toBeVisible();
  expect(users.queries.at(-1)).toMatchObject({ skip: "10", limit: "10" });
});

test("pagination falls back to the last page when a refetch shrinks the result set", async ({
  adminPage: page,
}) => {
  const users = await mockSequence(page, {
    path: "/admin/users",
    responses: [
      { body: aPageOfUsers },
      { body: aPageOfUsers },
      // A background refetch, triggered by the status toggle below, lands while
      // the user is on page 3 and returns a set that no longer has one.
      { body: { data: [adminUser], total_count: 12 } },
    ],
  });
  await mockJson(page, {
    method: "PATCH",
    path: "/admin/users/user-2/status",
    body: {},
  });

  await openAdminList(page, "/admin/users");
  await page.getByRole("button", { name: "3", exact: true }).click();
  await expect(page.getByText("Showing 21–25 of 25")).toBeVisible();

  await page
    .getByRole("button", { name: "Deactivate account for admin-user" })
    .click();
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();

  // DefaultPagination clamps instead of stranding the user on an empty page
  // with no reachable controls.
  await expect(page.getByText("Showing 11–12 of 12")).toBeVisible();
  await expect.poll(() => users.queries.at(-1)?.skip).toBe("10");
});

test("clearing filters restores the unfiltered first page", async ({
  adminPage: page,
}) => {
  await mockSequence(page, {
    path: "/admin/users",
    responses: [{ body: aPageOfUsers }],
  });

  await openAdminList(page, "/admin/users");

  const clear = page.getByRole("button", { name: "Clear" });
  await expect(clear, "nothing to clear yet").toBeDisabled();

  await page.getByLabel("Filter by user role").selectOption("admin");
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(clear, "an active filter enables clearing").toBeEnabled();
  await expect(page.getByText("Showing 11–20 of 25")).toBeVisible();

  await clear.click();

  await expect(clear).toBeDisabled();
  await expect(page.getByLabel("Filter by user role")).toHaveValue("");
  // The unfiltered first page is still in cache from mount, so this is a cache
  // hit rather than a request — assert the restored state, not the network.
  await expect(page.getByText("Showing 1–10 of 25")).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Search table" }),
  ).toHaveValue("");
});
