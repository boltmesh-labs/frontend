import { test, expect } from './fixtures/test';
import { mockJson, mockSequence } from './fixtures/api';
import { openAdminList } from './fixtures/navigation';
import { buildInvoice, buildPlan, buildSubscription, buildUser } from './fixtures/data';

const adminUser = buildUser({ id: 'user-2', username: 'admin-user', role: 'admin' });
const plan = buildPlan();
const subscription = buildSubscription({ plan, user_id: 'user-2' });

/**
 * The admin area always lands on the users list, so it has to answer even in
 * tests that are about something else.
 */
const mockAdminLanding = (page) =>
  mockJson(page, { path: '/admin/users', body: { data: [adminUser], total_count: 1 } });

/**
 * Detail pages resolve the records they link to (the owning user, the plan, the
 * region list). Left unmocked each is a 401 that the client reads as an expired
 * session, so the admin gets logged out before the action under test runs.
 */
const mockDetailLookups = (page) =>
  Promise.all([
    mockJson(page, { path: '/admin/users/user-2/profile', body: adminUser }),
    mockJson(page, { path: '/admin/plans', body: [plan] }),
    mockJson(page, { path: `/admin/plans/${plan.id}`, body: plan }),
    mockJson(page, { path: '/admin/vpn-regions', body: { data: [], total_count: 0 } }),
  ]);

test('an admin can cancel a pending invoice', async ({ adminPage: page }) => {
  const pendingInvoice = buildInvoice({
    plan,
    status: 'pending',
    plan_id: plan.id,
    user_id: adminUser.id,
  });
  await mockAdminLanding(page);
  await mockDetailLookups(page);
  await mockJson(page, {
    path: '/admin/invoices',
    body: { data: [{ ...pendingInvoice, plan, user: adminUser }], total_count: 1 },
  });
  await mockJson(page, {
    path: `/admin/invoices/${pendingInvoice.id}`,
    body: { ...pendingInvoice, plan, user: adminUser },
  });
  const cancel = await mockSequence(page, {
    method: 'POST',
    path: `/admin/invoices/${pendingInvoice.id}/cancel`,
    responses: [{ status: 200, body: {} }],
  });

  await openAdminList(page, '/admin/invoices');
  await page.getByRole('link', { name: pendingInvoice.id }).click();
  await expect(page.getByRole('heading', { name: 'Invoice' })).toBeVisible();

  await page.getByRole('button', { name: 'Cancel Invoice' }).click();
  await expect(page.getByText('Cancel Invoice', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Cancellation' }).click();

  await expect.poll(() => cancel.calls).toBe(1);
  await expect(page.getByText('Invoice canceled')).toBeVisible();
});

test('a failed invoice cancellation is reported and not retried', async ({ adminPage: page }) => {
  const pendingInvoice = buildInvoice({
    plan,
    status: 'pending',
    plan_id: plan.id,
    user_id: adminUser.id,
  });
  await mockAdminLanding(page);
  await mockDetailLookups(page);
  await mockJson(page, {
    path: '/admin/invoices',
    body: { data: [{ ...pendingInvoice, plan, user: adminUser }], total_count: 1 },
  });
  await mockJson(page, {
    path: `/admin/invoices/${pendingInvoice.id}`,
    body: { ...pendingInvoice, plan, user: adminUser },
  });
  const cancel = await mockSequence(page, {
    method: 'POST',
    path: `/admin/invoices/${pendingInvoice.id}/cancel`,
    responses: [{ status: 409, body: { detail: 'Invoice already settled' } }],
  });

  await openAdminList(page, '/admin/invoices');
  await page.getByRole('link', { name: pendingInvoice.id }).click();
  await expect(page.getByRole('heading', { name: 'Invoice' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel Invoice' }).click();
  await page.getByRole('button', { name: 'Confirm Cancellation' }).click();

  await expect(page.getByText('Invoice already settled')).toBeVisible();
  expect(cancel.calls, 'a rejected cancellation is not retried').toBe(1);
});

test('an admin can cancel a subscription', async ({ adminPage: page }) => {
  await mockAdminLanding(page);
  await mockDetailLookups(page);
  await mockJson(page, {
    path: '/admin/subscriptions',
    body: { data: [subscription], total_count: 1 },
  });
  await mockJson(page, {
    path: `/admin/subscriptions/${subscription.id}`,
    body: subscription,
  });
  await mockJson(page, { path: `/admin/vpn-devices/by-subscription/${subscription.id}`, body: [] });
  await mockJson(page, { path: `/admin/invoices/by-subscription/${subscription.id}`, body: [] });
  const cancel = await mockSequence(page, {
    method: 'POST',
    path: `/admin/subscriptions/${subscription.id}/cancel`,
    responses: [{ status: 200, body: {} }],
  });

  await openAdminList(page, '/admin/subscriptions');
  await page.getByRole('link', { name: subscription.id }).first().click();
  await expect(page.getByRole('heading', { name: 'Subscription' })).toBeVisible();

  await page.getByRole('button', { name: 'Cancel subscription immediately' }).click();
  await expect(page.getByText('Cancel Subscription', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().click();

  await expect.poll(() => cancel.calls).toBe(1);
});

test('an admin takes a VPN server offline and back online', async ({ adminPage: page }) => {
  const server = {
    id: 'server-1',
    name: 'Test Server',
    status: 'online',
    is_manual: true,
    region: { id: 'region-1', name: 'Test Region' },
  };
  await mockAdminLanding(page);
  // The status flip is optimistic, so the list is seeded with the current state
  // and the refetch after settling returns the new one.
  const servers = await mockSequence(page, {
    path: '/admin/vpn-servers',
    responses: [
      { body: { data: [server], total_count: 1 } },
      { body: { data: [{ ...server, status: 'maintenance' }], total_count: 1 } },
    ],
  });
  const patch = await mockSequence(page, {
    method: 'PATCH',
    path: '/admin/vpn-servers/server-1',
    requestBody: { status: 'maintenance' },
    responses: [{ status: 200, body: {} }],
  });

  await openAdminList(page, '/admin/vpn-servers');
  await expect(page.getByRole('heading', { name: 'VPN Server Management' })).toBeVisible();

  const toggle = page.getByRole('checkbox', { name: 'Toggle active status for Test Server' });
  await expect(toggle).toBeChecked();
  await toggle.click();
  // The flip is optimistic, so the switch clears as soon as the mutation starts
  // rather than after the PATCH resolves.
  await expect.poll(() => toggle.isChecked()).toBe(false);

  await expect.poll(() => patch.calls).toBe(1);
  await expect(page.getByText('Server status updated to maintenance.')).toBeVisible();
  await expect.poll(() => servers.calls, 'the list refetched after settling').toBe(2);
});

test('a VPN server in a non-toggleable state cannot be flipped', async ({ adminPage: page }) => {
  await mockAdminLanding(page);
  await mockJson(page, {
    path: '/admin/vpn-servers',
    body: {
      data: [
        {
          id: 'server-2',
          name: 'Decommissioned Server',
          status: 'decommissioned',
          is_manual: true,
        },
      ],
      total_count: 1,
    },
  });

  await openAdminList(page, '/admin/vpn-servers');
  await expect(page.getByRole('heading', { name: 'VPN Server Management' })).toBeVisible();

  // Only online/maintenance are reversible; anything else must be a dead switch.
  await expect(
    page.getByRole('checkbox', { name: 'Toggle active status for Decommissioned Server' })
  ).toBeDisabled();
});

test('an admin can deactivate a VPN device after confirming', async ({ adminPage: page }) => {
  const device = { id: 'device-1', name: 'Pixel 8', is_active: true, platform: 'android' };
  await mockAdminLanding(page);
  await mockJson(page, { path: '/admin/vpn-devices', body: { data: [device], total_count: 1 } });
  const patch = await mockSequence(page, {
    method: 'PATCH',
    path: '/admin/vpn-devices/device-1/status',
    responses: [{ status: 200, body: {} }],
  });

  await openAdminList(page, '/admin/vpn-devices');
  await expect(page.getByRole('heading', { name: 'VPN Devices' })).toBeVisible();

  await page.getByRole('button', { name: 'Deactivate device Pixel 8' }).click();
  await expect(page.getByText('Deactivate Device', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();

  await expect.poll(() => patch.calls).toBe(1);
  await expect(page.getByText('Device status updated')).toBeVisible();
});

test('a failed device toggle rolls the row back', async ({ adminPage: page }) => {
  const device = { id: 'device-1', name: 'Pixel 8', is_active: true, platform: 'android' };
  await mockAdminLanding(page);
  await mockJson(page, { path: '/admin/vpn-devices', body: { data: [device], total_count: 1 } });
  await mockJson(page, {
    method: 'PATCH',
    path: '/admin/vpn-devices/device-1/status',
    status: 500,
    body: { detail: 'Device registry unavailable' },
  });

  await openAdminList(page, '/admin/vpn-devices');
  await expect(page.getByRole('heading', { name: 'VPN Devices' })).toBeVisible();

  await page.getByRole('button', { name: 'Deactivate device Pixel 8' }).click();
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();

  // The optimistic flip is reverted, so the row still offers Deactivate.
  await expect(page.getByText('Device registry unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deactivate device Pixel 8' })).toBeVisible();
});

test('the node registration audit log renders its failure states', async ({ adminPage: page }) => {
  await mockAdminLanding(page);
  await mockJson(page, { path: '/admin/vpn-servers', body: { data: [], total_count: 0 } });
  await mockJson(page, {
    path: '/admin/audit/node-registration-logs',
    body: {
      data: [
        {
          id: 'audit-1',
          server_name: 'node-1',
          status: 'TUNNEL_ADDRESS_OVERLAP',
          auth_method: 'BOOTSTRAP_SECRET',
          ip_address: '10.0.0.4',
          region_id: 'region-1',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      total_count: 1,
    },
  });

  await openAdminList(page, '/admin/vpn-servers');
  await page.getByRole('button', { name: 'Audit Logs' }).click();
  await expect(page.getByRole('heading', { name: 'Node Registration Audit' })).toBeVisible();

  // Operators rely on these two values verbatim to diagnose a join failure.
  await expect(page.getByRole('cell', { name: 'TUNNEL_ADDRESS_OVERLAP' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'BOOTSTRAP_SECRET' })).toBeVisible();
});
