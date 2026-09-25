import { test, expect } from './fixtures/test';
import { mockJson } from './fixtures/api';
import { buildInvoice, buildPlan, buildSubscription } from './fixtures/data';

const plan = buildPlan();
const subscription = buildSubscription({ plan });
const invoice = buildInvoice({
  plan,
  payment_method: 'lightning',
  status: 'paid',
  created_at: '2026-01-01T00:00:00Z',
});

const mockUserContentApi = async (page) => {
  await mockJson(page, { path: '/subscriptions', body: [subscription] });
  await mockJson(page, {
    path: '/invoices',
    body: { data: [invoice], total_count: 1 },
  });
  await mockJson(page, { path: '/plans', body: [plan] });
};

test('a user can review subscriptions, invoices, and account settings', async ({
  userPage: page,
}) => {
  await mockUserContentApi(page);

  await page
    .locator('#main-content')
    .getByRole('link', { name: /Subscriptions/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Subscriptions' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Starter Plan' })).toBeVisible();

  await page.locator('nav').getByRole('link', { name: 'Dashboard' }).click();
  await page
    .locator('#main-content')
    .getByRole('link', { name: /Billing & Invoices/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Invoices & Billing' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'invoice-1' })).toBeVisible();

  await page.locator('nav').getByRole('link', { name: 'Dashboard' }).click();
  await page
    .locator('#main-content')
    .getByRole('link', { name: /Account Settings/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
});
