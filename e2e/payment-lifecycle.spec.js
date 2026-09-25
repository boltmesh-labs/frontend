import { test, expect } from './fixtures/test';
import { mockJson, mockSequence } from './fixtures/api';
import { allowSessionReload } from './fixtures/auth';
import { buildInvoice, buildPlan } from './fixtures/data';

const plan = buildPlan();
const pendingInvoice = buildInvoice({ plan, status: 'pending' });

/**
 * The payment page is reached through the invoice detail page rather than by
 * goto(), so the session survives and the whole click path is exercised.
 */
const openPaymentPage = async (page, { invoice = pendingInvoice } = {}) => {
  await mockJson(page, { path: '/invoices', body: { data: [invoice], total_count: 1 } });
  await mockJson(page, { path: '/plans', body: [plan] });
  await mockJson(page, { path: `/invoices/${invoice.id}`, body: invoice });
  await mockJson(page, { path: `/plans/${plan.id}`, body: plan });

  await page
    .locator('#main-content')
    .getByRole('link', { name: /Billing & Invoices/ })
    .click();
  await page.getByRole('link', { name: invoice.id }).click();
  await expect(page.getByRole('heading', { name: 'Invoice Details' })).toBeVisible();
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page).toHaveURL(new RegExp(`/payment/${invoice.id}$`));
};

test('a pending invoice waits for payment and offers a manual status check', async ({
  userPage: page,
}) => {
  const status = await mockSequence(page, {
    path: `/invoices/${pendingInvoice.id}/status`,
    responses: [
      { status: 200, body: { status: 'pending', amount_paid: 0, amount_requested: 0.0002 } },
    ],
  });

  await openPaymentPage(page);

  await expect(page.getByRole('heading', { name: 'Send Payment' })).toBeVisible();
  await expect(page.getByText('Waiting for payment')).toBeVisible();
  await expect(page.locator('#payment-destination')).toHaveValue('lnbc1testaddress');
  expect(status.calls).toBe(1);

  // The endpoint settles server-side, so a manual re-check is the user's only
  // way to advance the page without waiting for the 15s poll.
  await page.getByRole('button', { name: 'Check Status' }).click();
  await expect.poll(() => status.calls).toBe(2);
});

test('a partial payment states the remaining balance', async ({ userPage: page }) => {
  const status = await mockSequence(page, {
    path: `/invoices/${pendingInvoice.id}/status`,
    responses: [
      {
        status: 200,
        body: { status: 'partially_paid', amount_paid: 0.0001, amount_requested: 0.0002 },
      },
    ],
  });

  await openPaymentPage(page);

  await expect(page.getByText('Partially paid')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay Remaining Balance' })).toBeVisible();
  expect(status.calls).toBe(1);
});

test('a settled invoice confirms the payment and returns to the dashboard', async ({
  userPage: page,
}) => {
  const status = await mockSequence(page, {
    path: `/invoices/${pendingInvoice.id}/status`,
    responses: [
      { status: 200, body: { status: 'pending', amount_paid: 0, amount_requested: 0.0002 } },
      { status: 200, body: { status: 'paid', amount_paid: 0.0002, amount_requested: 0.0002 } },
    ],
  });

  await openPaymentPage(page);
  await expect(page.getByText('Waiting for payment')).toBeVisible();

  await page.getByRole('button', { name: 'Check Status' }).click();

  await expect(page.getByText('Payment confirmed')).toBeVisible();
  // A terminal state means the plan is now active server-side; the dashboard
  // must be refetched rather than served from the pre-payment cache.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 8000 });
  await expect(page.getByRole('heading', { name: 'Account Dashboard' })).toBeVisible();
  // The redirect invalidates the whole dashboard key family, so the status
  // query is refetched once more on the way out.
  expect(status.calls).toBeGreaterThanOrEqual(2);
});

test('an expired invoice is shown as expired and the countdown is dropped', async ({
  userPage: page,
}) => {
  const expired = buildInvoice({ plan, status: 'pending', expires_at: '2020-01-01T00:00:00Z' });
  const status = await mockSequence(page, {
    path: `/invoices/${expired.id}/status`,
    responses: [
      { status: 200, body: { status: 'pending', amount_paid: 0, amount_requested: 0.0002 } },
    ],
  });

  await allowSessionReload(page);
  await mockJson(page, { path: `/invoices/${expired.id}`, body: expired });
  await mockJson(page, { path: `/plans/${plan.id}`, body: plan });

  // An expired invoice deliberately offers no Pay button on the detail page,
  // so the only way onto its payment page is a direct link.
  await page.goto(`/payment/${expired.id}`);
  await expect(page.getByRole('heading', { name: 'Send Payment' })).toBeVisible();

  // The deadline is authoritative over the reported status, so a stale
  // "pending" from the API cannot keep an unpaid invoice alive.
  await expect(page.getByText('Invoice expired')).toBeVisible();
  await expect(page.getByText('Time Remaining')).toHaveCount(0);
  // The status query is enabled while the invoice body is still loading, so a
  // single check escapes before the expired deadline disables it; what matters
  // is that it does not keep polling.
  expect(status.calls).toBeLessThanOrEqual(1);
});

test('a status check that errors keeps the payment page usable', async ({ userPage: page }) => {
  await mockJson(page, {
    path: `/invoices/${pendingInvoice.id}/status`,
    status: 500,
    body: { detail: 'Status service unavailable' },
  });

  await openPaymentPage(page);

  await expect(page.getByText('Error checking payment status')).toBeVisible();
  // The payment destination must survive a failed poll; the user still needs it.
  await expect(page.locator('#payment-destination')).toHaveValue('lnbc1testaddress');
});

test('a lightning invoice links out to a native wallet', async ({ userPage: page }) => {
  await mockJson(page, {
    path: `/invoices/${pendingInvoice.id}/status`,
    body: { status: 'pending', amount_paid: 0, amount_requested: 0.0002 },
  });

  await openPaymentPage(page);

  const walletButton = page.getByRole('button', { name: 'Open in Native Wallet' });
  await expect(walletButton).toBeEnabled();
  await expect(walletButton).toHaveAttribute('href', 'lightning:lnbc1testaddress');
});

test('an unsupported payment URI falls back to copy-only', async ({ userPage: page }) => {
  const moneroInvoice = buildInvoice({
    plan,
    status: 'pending',
    payment_method: 'monero',
    crypto_address: '4testmoneroaddress',
    payment_uri: 'https://example.com/pay/abc',
  });
  await mockJson(page, {
    path: `/invoices/${moneroInvoice.id}/status`,
    body: { status: 'pending', amount_paid: 0, amount_requested: 0.0002 },
  });

  await openPaymentPage(page, { invoice: moneroInvoice });

  // An https:// URI is not a wallet scheme, so deep-linking it would be a dead
  // button; the page has to say so rather than offer it.
  await expect(page.getByRole('button', { name: 'Open in Native Wallet' })).toBeDisabled();
  await expect(page.getByText('Wallet link unavailable')).toBeVisible();
  await expect(page.locator('#payment-destination')).toHaveValue('4testmoneroaddress');
});
