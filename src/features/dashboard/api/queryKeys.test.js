// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dashboardKeys } from './queryKeys';

describe('dashboardKeys', () => {
  it('builds singleton keys under the dashboard family', () => {
    expect(dashboardKeys.profile()).toEqual(['dashboard', 'profile']);
    expect(dashboardKeys.plans()).toEqual(['dashboard', 'plans']);
    expect(dashboardKeys.subscriptions()).toEqual(['dashboard', 'subscriptions']);
    expect(dashboardKeys.devices()).toEqual(['dashboard', 'devices']);
    expect(dashboardKeys.accountSettings()).toEqual(['dashboard', 'account-settings']);
  });

  it('scopes detail keys so invalidateQueries(prefix) reaches them', () => {
    expect(dashboardKeys.planDetail('p1')).toEqual(['dashboard', 'plans', 'detail', 'p1']);
    expect(dashboardKeys.subscriptionDetail('s1'));
    expect(dashboardKeys.invoiceDetail('i1')).toEqual(['dashboard', 'invoices', 'detail', 'i1']);
    expect(dashboardKeys.invoiceStatus('i1')).toEqual(['dashboard', 'invoices', 'status', 'i1']);
  });

  it('invoices() omits the params slot only when called bare', () => {
    expect(dashboardKeys.invoices()).toEqual(['dashboard', 'invoices']);
    expect(dashboardKeys.invoices({ skip: 0 })).toEqual(['dashboard', 'invoices', { skip: 0 }]);
  });

  it('cryptoPrices defaults to USD quotes', () => {
    expect(dashboardKeys.cryptoPrices()).toEqual(['dashboard', 'crypto', 'prices', 'USD']);
    expect(dashboardKeys.cryptoPrices('EUR')).toEqual(['dashboard', 'crypto', 'prices', 'EUR']);
  });
});
