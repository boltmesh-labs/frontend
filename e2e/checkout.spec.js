import { test, expect } from './fixtures/test';
import { mockJson } from './fixtures/api';
import { buildInvoice, buildPlan } from './fixtures/data';

const plan = buildPlan();
const invoice = buildInvoice({ plan });

const mockCheckoutApi = async (
  page,
  {
    currencies = ['usd'],
    expectedFiatCurrency = 'USD',
    invoiceStatus = 201,
    invoiceBody = { id: invoice.id },
    invoiceDetailStatus = 200,
    invoiceDetailBody = invoice,
  } = {}
) => {
  await mockJson(page, { path: '/plans', body: [plan] });
  await mockJson(page, { path: '/plans/plan-1', body: plan });
  await mockJson(page, { path: '/subscriptions', body: [] });
  await mockJson(page, { path: '/crypto/currencies', body: { currencies } });
  await mockJson(page, { path: '/crypto/prices', body: { bitcoin: 50000, monero: 100 } });
  await mockJson(page, {
    path: '/crypto/fx-rate',
    body: { fiat_currency: 'EUR', rate_to_usd: 0.92 },
  });
  await mockJson(page, {
    method: 'POST',
    path: '/invoices',
    status: invoiceStatus,
    requestBody: {
      plan_id: plan.id,
      payment_method: 'lightning',
      fiat_currency: expectedFiatCurrency,
    },
    body: invoiceBody,
  });
  await mockJson(page, {
    path: '/invoices/invoice-1',
    status: invoiceDetailStatus,
    body: invoiceDetailBody,
  });
  await mockJson(page, {
    path: '/invoices/invoice-1/status',
    body: { status: 'pending', amount_paid: 0, amount_requested: 0.0002 },
  });
};

test('a user can create a crypto invoice from the dashboard', async ({ userPage: page }) => {
  await mockCheckoutApi(page);

  await page.getByRole('button', { name: 'Choose a VPN Plan' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a VPN Plan' })).toBeVisible();

  await page.getByRole('button', { name: 'Select Plan' }).click();
  await expect(page.getByRole('heading', { name: 'Review & Pay' })).toBeVisible();

  await page.getByRole('button', { name: 'Generate Bitcoin Invoice' }).click();

  await expect(page).toHaveURL(/\/payment\/invoice-1$/);
  await expect(page.getByRole('heading', { name: 'Send Payment' })).toBeVisible();
  await expect(page.locator('#payment-destination')).toHaveValue('lnbc1testaddress');
});

test('checkout can change billing currency and shows invoice creation errors', async ({
  userPage: page,
}) => {
  await mockCheckoutApi(page, {
    currencies: ['usd', 'eur'],
    expectedFiatCurrency: 'EUR',
    invoiceStatus: 400,
    invoiceBody: { detail: 'Unable to create invoice' },
  });

  await page.getByRole('button', { name: 'Choose a VPN Plan' }).click();
  await page.getByRole('button', { name: 'Select Plan' }).click();
  await page.getByRole('button', { name: 'EUR', exact: true }).click();

  await expect(page.getByRole('button', { name: 'EUR', exact: true })).toHaveClass(/btn-primary/);
  await page.getByRole('button', { name: 'Generate Bitcoin Invoice' }).click();

  await expect(page.getByRole('alert')).toHaveText(/Unable to create invoice/);
  await expect(page).toHaveURL(/\/checkout\/plan-1$/);
});

test('payment page explains when an invoice cannot be loaded', async ({ userPage: page }) => {
  await mockCheckoutApi(page, {
    invoiceDetailStatus: 500,
    invoiceDetailBody: { detail: 'Invoice service unavailable' },
  });

  await page.getByRole('button', { name: 'Choose a VPN Plan' }).click();
  await page.getByRole('button', { name: 'Select Plan' }).click();
  await page.getByRole('button', { name: 'Generate Bitcoin Invoice' }).click();

  await expect(page).toHaveURL(/\/payment\/invoice-1$/);
  await expect(page.getByRole('heading', { name: 'Send Payment' })).toBeVisible();
  await expect(page.getByText(/could not load this invoice/)).toBeVisible();
});
