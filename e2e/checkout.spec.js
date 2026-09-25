import { test, expect } from '@playwright/test';

import { mockAuthApi, signIn } from './fixtures/auth';

const plan = {
  id: 'plan-1',
  name: 'Starter Plan',
  description: 'Reliable VPN access for one device.',
  duration_in_days: 30,
  max_devices: 1,
  features: ['Fast VPN access', 'One connected device'],
  price_usd: 9.99,
  billing_cycle: 'monthly',
  enabled: true,
};

const invoice = {
  id: 'invoice-1',
  plan_id: plan.id,
  plan,
  crypto_address: 'lnbc1testaddress',
  payment_uri: 'lightning:lnbc1testaddress',
  payment_method: 'lightning',
  currency: 'usd',
  amount_requested: 0.0002,
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

const mockCheckoutApi = async (page) => {
  await page.route('**/plans', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([plan]),
    });
  });

  await page.route('**/plans/plan-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(plan),
    });
  });

  await page.route('**/subscriptions', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/crypto/currencies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ currencies: ['usd'] }),
    });
  });

  await page.route('**/crypto/prices*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bitcoin: 50000, monero: 100 }),
    });
  });

  await page.route('**/invoices', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: invoice.id }),
    });
  });

  await page.route('**/invoices/invoice-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(invoice),
    });
  });

  await page.route('**/invoices/invoice-1/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'pending', amount_paid: 0, amount_requested: 0.0002 }),
    });
  });
};

test('a user can create a crypto invoice from the dashboard', async ({ page }) => {
  await mockAuthApi(page);
  await mockCheckoutApi(page);
  await signIn(page);

  await page.getByRole('button', { name: 'Choose a VPN Plan' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a VPN Plan' })).toBeVisible();

  await page.getByRole('button', { name: 'Select Plan' }).click();
  await expect(page.getByRole('heading', { name: 'Review & Pay' })).toBeVisible();

  await page.getByRole('button', { name: 'Generate Bitcoin Invoice' }).click();

  await expect(page).toHaveURL(/\/payment\/invoice-1$/);
  await expect(page.getByRole('heading', { name: 'Send Payment' })).toBeVisible();
  await expect(page.locator('#payment-destination')).toHaveValue('lnbc1testaddress');
});
