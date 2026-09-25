import { test, expect } from '@playwright/test';

import { mockAuthApi, signIn } from './fixtures/auth';

const plan = {
  id: 'plan-1',
  name: 'Starter Plan',
  billing_cycle: 'monthly',
  price_usd: 9.99,
};

const subscription = {
  id: 'subscription-1',
  status: 'active',
  expires_at: '2099-01-01T00:00:00Z',
  plan,
};

const invoice = {
  id: 'invoice-1',
  plan_id: plan.id,
  payment_method: 'lightning',
  status: 'paid',
  created_at: '2026-01-01T00:00:00Z',
};

const mockUserContentApi = async (page) => {
  await page.route('**/subscriptions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([subscription]),
    });
  });

  await page.route('**/invoices*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [invoice], total_count: 1 }),
    });
  });

  await page.route('**/plans', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([plan]),
    });
  });
};

test('a user can review subscriptions, invoices, and account settings', async ({ page }) => {
  await mockAuthApi(page);
  await mockUserContentApi(page);
  await signIn(page);

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
