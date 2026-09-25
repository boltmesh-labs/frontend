import { test, expect } from './fixtures/test';
import { mockJson } from './fixtures/api';
import { buildInvoice, buildPlan } from './fixtures/data';

const plan = buildPlan();
const invoice = buildInvoice({ plan });

const mockCheckoutApi = async (page) => {
  await mockJson(page, { path: '/plans', body: [plan] });
  await mockJson(page, { path: '/plans/plan-1', body: plan });
  await mockJson(page, { path: '/subscriptions', body: [] });
  await mockJson(page, { path: '/crypto/currencies', body: { currencies: ['usd'] } });
  await mockJson(page, { path: '/crypto/prices', body: { bitcoin: 50000, monero: 100 } });
  await mockJson(page, {
    method: 'POST',
    path: '/invoices',
    status: 201,
    requestBody: { plan_id: plan.id, payment_method: 'lightning', fiat_currency: 'USD' },
    body: { id: invoice.id },
  });
  await mockJson(page, { path: '/invoices/invoice-1', body: invoice });
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
