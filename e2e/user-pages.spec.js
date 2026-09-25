import { test, expect } from './fixtures/test';
import { mockJson, mockSequence } from './fixtures/api';
import { openUserList } from './fixtures/navigation';
import { buildInvoice, buildPlan, buildSubscription, buildUser } from './fixtures/data';

const plan = buildPlan();
const subscription = buildSubscription({ plan });
const pendingInvoice = buildInvoice({
  plan,
  status: 'pending',
  payment_method: 'lightning',
  created_at: '2026-01-01T00:00:00Z',
});

const device = {
  id: 'device-1',
  name: 'Pixel 8',
  is_active: true,
  platform: 'android',
  public_key: 'pubkey-device-1',
};

/**
 * The device page reads the profile and the active subscription to work out how
 * many device slots are free, so both have to answer or the request falls
 * through to a real API and logs the user out.
 */
const mockDevicePage = async (page) => {
  await mockJson(page, { path: '/users', body: buildUser({ active_subscription: subscription }) });
  await mockJson(page, { path: '/subscriptions', body: [subscription] });
};

test('a user can reach the devices page and see their active devices', async ({
  userPage: page,
}) => {
  await mockDevicePage(page);
  await mockJson(page, { path: '/vpn-devices', body: [device] });

  await openUserList(page, 'VPN Devices');

  await expect(page.getByRole('heading', { name: 'VPN Devices' })).toBeVisible();
  await expect(page.getByText('Pixel 8').first()).toBeVisible();
});

test('a user can revoke a device after confirming', async ({ userPage: page }) => {
  await mockDevicePage(page);
  await mockJson(page, { path: '/vpn-devices', body: [device] });
  const revoke = await mockSequence(page, {
    method: 'DELETE',
    path: '/vpn-devices/device-1',
    responses: [{ status: 204, body: {} }],
  });

  await openUserList(page, 'VPN Devices');
  await expect(page.getByRole('heading', { name: 'VPN Devices' })).toBeVisible();
  await page.getByRole('button', { name: 'Revoke' }).click();

  // Revoking drops a WireGuard key, so it must be confirmed by name.
  await expect(page.getByText('Revoke Device', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Revoke' }).click();

  await expect.poll(() => revoke.calls).toBe(1);
  await expect(page.getByText('has been revoked')).toBeVisible();
});

test('a user can review an invoice and cancel it while it is pending', async ({
  userPage: page,
}) => {
  await mockJson(page, { path: '/invoices', body: { data: [pendingInvoice], total_count: 1 } });
  await mockJson(page, { path: '/plans', body: [plan] });
  await mockJson(page, { path: `/invoices/${pendingInvoice.id}`, body: pendingInvoice });
  await mockJson(page, { path: `/plans/${plan.id}`, body: plan });
  const cancel = await mockSequence(page, {
    method: 'POST',
    path: `/invoices/${pendingInvoice.id}/cancel`,
    responses: [{ status: 200, body: {} }],
  });

  await openUserList(page, 'Billing & Invoices');
  await page.getByRole('link', { name: pendingInvoice.id }).click();

  await expect(page.getByRole('heading', { name: 'Invoice Details' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Cancel Invoice', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().click();

  await expect.poll(() => cancel.calls).toBe(1);
  await expect(page.getByText(/canceled/i).first()).toBeVisible();
});

test('a paid invoice offers no cancel action', async ({ userPage: page }) => {
  const paidInvoice = buildInvoice({
    plan,
    status: 'paid',
    created_at: '2026-01-01T00:00:00Z',
  });
  await mockJson(page, { path: '/invoices', body: { data: [paidInvoice], total_count: 1 } });
  await mockJson(page, { path: '/plans', body: [plan] });
  await mockJson(page, { path: `/invoices/${paidInvoice.id}`, body: paidInvoice });
  await mockJson(page, { path: `/plans/${plan.id}`, body: plan });

  await openUserList(page, 'Billing & Invoices');
  await page.getByRole('link', { name: paidInvoice.id }).click();

  await expect(page.getByRole('heading', { name: 'Invoice Details' })).toBeVisible();
  // Cancelling a settled invoice would contradict the payment record.
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pay' })).toHaveCount(0);
});

test('a user can review a subscription with its devices and invoices', async ({
  userPage: page,
}) => {
  await mockJson(page, { path: '/subscriptions', body: [subscription] });
  await mockJson(page, { path: `/subscriptions/${subscription.id}`, body: subscription });
  await mockJson(page, { path: `/vpn-devices/by-subscription/${subscription.id}`, body: [device] });
  await mockJson(page, {
    path: `/invoices/by-subscription/${subscription.id}`,
    body: [pendingInvoice],
  });

  await openUserList(page, 'Subscriptions');
  await page.getByRole('button', { name: 'Details' }).first().click();

  await expect(page.getByRole('heading', { name: 'Subscription Details' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Pixel 8' })).toBeVisible();
  await expect(page.getByRole('link', { name: pendingInvoice.id }).first()).toBeVisible();
});

test('a user can cancel a subscription after confirming', async ({ userPage: page }) => {
  await mockJson(page, { path: '/subscriptions', body: [subscription] });
  await mockJson(page, { path: `/subscriptions/${subscription.id}`, body: subscription });
  await mockJson(page, { path: `/vpn-devices/by-subscription/${subscription.id}`, body: [] });
  await mockJson(page, { path: `/invoices/by-subscription/${subscription.id}`, body: [] });
  const cancel = await mockSequence(page, {
    method: 'POST',
    path: `/subscriptions/${subscription.id}/cancel`,
    responses: [{ status: 200, body: {} }],
  });

  await openUserList(page, 'Subscriptions');
  await page.getByRole('button', { name: 'Details' }).first().click();
  await expect(page.getByRole('heading', { name: 'Subscription Details' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel Subscription' }).click();

  // The button and the dialog title share this label, so scope to the dialog.
  await expect(page.getByRole('dialog').getByText('Cancel Subscription')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Cancellation' }).click();

  await expect.poll(() => cancel.calls).toBe(1);
});

test('a user can update their profile after confirming', async ({ userPage: page }) => {
  const updated = buildUser({ username: 'renamed-user' });
  const update = await mockSequence(page, {
    method: 'PATCH',
    path: '/users',
    responses: [{ status: 200, body: updated }],
  });

  await openUserList(page, 'Account Settings');
  await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();

  await page.locator('#formUsername').fill('renamed-user');
  // The backend requires the current password to re-identify the caller.
  await page.locator('#formProfileCurrentPassword').fill('current-secret');
  await page.getByRole('button', { name: 'Save Profile Changes' }).click();

  await expect(page.getByText('Save Profile Changes?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect.poll(() => update.calls).toBe(1);
  expect(update.queries.at(-1)).toBeDefined();
  await expect(page.getByText('Profile updated successfully')).toBeVisible();
});

test('a profile update without the current password is blocked in the browser', async ({
  userPage: page,
}) => {
  const update = await mockSequence(page, {
    method: 'PATCH',
    path: '/users',
    responses: [{ status: 200, body: buildUser() }],
  });

  await openUserList(page, 'Account Settings');
  await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();

  await page.locator('#formUsername').fill('renamed-user');

  // The current-password field is required, so the browser blocks the submit
  // outright; the app's own guard is a second line of defence, not the one a
  // real user hits.
  await expect(page.locator('#formProfileCurrentPassword')).toHaveJSProperty(
    'validity.valueMissing',
    true
  );
  await page.getByRole('button', { name: 'Save Profile Changes' }).click();

  expect(update.calls, 'no identity re-check means no request').toBe(0);
  await expect(page.getByText('Save Profile Changes?', { exact: true })).toHaveCount(0);
});

test('a user can change their password after confirming', async ({ userPage: page }) => {
  const change = await mockSequence(page, {
    method: 'PUT',
    path: '/users/change-password',
    responses: [{ status: 200, body: {} }],
  });

  await openUserList(page, 'Account Settings');
  await page.getByRole('tab', { name: /Security/ }).click();
  await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();

  await page.locator('#formNewPassword').fill('a-brand-new-secret');
  await page.locator('#formConfirmPassword').fill('a-brand-new-secret');
  await page.locator('#formCurrentPassword').fill('old-secret');
  await page.getByRole('button', { name: 'Update Password' }).click();

  await expect(page.getByText('Update Password?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Update Password' }).last().click();

  await expect.poll(() => change.calls).toBe(1);
  await expect(page.getByText('Password updated successfully')).toBeVisible();
});

test('a mismatched new password is rejected before any request', async ({ userPage: page }) => {
  const change = await mockSequence(page, {
    method: 'PUT',
    path: '/users/change-password',
    responses: [{ status: 200, body: {} }],
  });

  await openUserList(page, 'Account Settings');
  await page.getByRole('tab', { name: /Security/ }).click();
  await page.locator('#formNewPassword').fill('a-brand-new-secret');
  await page.locator('#formConfirmPassword').fill('a-different-secret');
  await page.locator('#formCurrentPassword').fill('old-secret');
  await page.getByRole('button', { name: 'Update Password' }).click();

  await expect(page.getByText('New passwords do not match.')).toBeVisible();
  expect(change.calls).toBe(0);
});

test('account deletion requires typing DELETE', async ({ userPage: page }) => {
  const remove = await mockSequence(page, {
    method: 'POST',
    path: '/users/delete-request',
    responses: [{ status: 200, body: {} }],
  });

  await openUserList(page, 'Account Settings');
  await page.getByRole('tab', { name: /Delete Account/ }).click();
  await expect(page.getByRole('heading', { name: 'Danger Zone' })).toBeVisible();

  // A stray click must not be able to start account deletion.
  await expect(page.getByRole('button', { name: 'Delete Account' })).toBeDisabled();

  await page.locator('#formConfirmDelete').fill('DELETE');
  await expect(page.getByRole('button', { name: 'Delete Account' })).toBeEnabled();
  await page.getByRole('button', { name: 'Delete Account' }).click();

  await expect.poll(() => remove.calls).toBe(1);
  // The confirmation is announced both as a toast and as a panel; the panel is
  // the durable one, so assert on it specifically.
  await expect(page.getByText('Confirmation email sent').last()).toBeVisible();
});
