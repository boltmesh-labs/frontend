export const dashboardKeys = {
  all: ['dashboard'],
  profile: () => [...dashboardKeys.all, 'profile'],
  // Public catalog list fetched by BuyPlan via GET /plans.
  plans: () => [...dashboardKeys.all, 'plans'],
  // Fetched by Checkout via the public GET /plans/{id} endpoint (the backend
  // 404s for both unknown and disabled plans).
  planDetail: (id) => [...dashboardKeys.all, 'plans', 'detail', id],
  // Backend list endpoints for subscriptions/devices/regions accept no query
  // params, so their keys carry none (keeps invalidateQueries prefix-matching
  // consistent with the query keys created by the hooks).
  subscriptions: () => [...dashboardKeys.all, 'subscriptions'],
  subscriptionDetail: (id) => [...dashboardKeys.all, 'subscriptions', 'detail', id],
  // List factory: a bare call returns the scope key so invalidateQueries
  // prefix-matches every parametrized invoices list (mirrors adminKeys).
  invoices: (params) => [
    ...dashboardKeys.all,
    'invoices',
    ...(params !== undefined ? [params] : []),
  ],
  invoiceDetail: (id) => [...dashboardKeys.all, 'invoices', 'detail', id],
  // Polled by the Payment page (GET /invoices/{id}/status). Nested under the
  // family so invalidateQueries(dashboardKeys.all) covers it too.
  invoiceStatus: (id) => [...dashboardKeys.all, 'invoices', 'status', id],
  invoicesBySubscription: (subscriptionId) => [
    ...dashboardKeys.all,
    'invoices',
    'by-subscription',
    subscriptionId,
  ],
  devices: () => [...dashboardKeys.all, 'devices'],
  devicesBySubscription: (subscriptionId) => [
    ...dashboardKeys.all,
    'devices',
    'by-subscription',
    subscriptionId,
  ],
  // Public fiat -> crypto quotes (GET /crypto/prices), used by Checkout.
  // Lives inside the dashboard family so invalidateQueries(dashboardKeys.all)
  // also refreshes outstanding quotes.
  cryptoPrices: (fiatCurrency = 'USD') => [...dashboardKeys.all, 'crypto', 'prices', fiatCurrency],
  // Supported fiat pricing currencies for checkout (GET /crypto/currencies).
  // Nested under 'crypto' alongside quotes so invalidateQueries(dashboardKeys.all)
  // refreshes them together.
  currencies: () => [...dashboardKeys.all, 'crypto', 'currencies'],
  // USD-per-fiat cross rate (GET /crypto/fx-rate) used by Checkout to preview
  // converted plan prices; nested under 'crypto' alongside the other quotes.
  fxRate: (fiatCurrency = 'USD') => [...dashboardKeys.all, 'crypto', 'fx-rate', fiatCurrency],
  accountSettings: () => [...dashboardKeys.all, 'account-settings'],
};
