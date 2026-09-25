import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import Checkout from './Checkout';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { get: vi.fn(), post: vi.fn() },
  },
}));

const plan = {
  id: 'plan-1',
  name: 'Standard',
  description: 'The standard plan',
  price_usd: 10,
  duration_in_days: 30,
  max_devices: 2,
  features: ['Fast servers'],
  enabled: true,
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderCheckout = (planId = 'plan-1') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/checkout/${planId}`]}>
        <Routes>
          <Route path="/checkout/:planId" element={<Checkout />} />
          <Route path="/buy-plan" element={<div>BuyPlan page</div>} />
          <Route path="/payment/:invoiceId" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockImplementation(async (url, config) => {
      if (url === '/plans/plan-1') return { data: plan };
      if (url === '/users') return { data: { plan: null } };
      if (url === '/subscriptions') return { data: [] };
      if (url === '/crypto/currencies') return { data: { currencies: ['usd', 'eur', 'gbp'] } };
      if (url.startsWith('/crypto/prices')) {
        return { data: { fiat_currency: 'USD', bitcoin: 100000, monero: 200 } };
      }
      if (url === '/crypto/fx-rate') {
        // USD per unit of the requested fiat; derived from the axios params.
        const currency = config?.params?.fiat_currency;
        const rates = { EUR: 0.8, GBP: 0.8 };
        return {
          data: { fiat_currency: String(currency).toLowerCase(), rate_to_usd: rates[currency] },
        };
      }
      return { data: {} };
    });
  });

  it('fetches the plan by route param and renders the order summary', async () => {
    renderCheckout();

    expect(await screen.findByText('Standard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate bitcoin invoice/i })).toBeInTheDocument();
  });

  it('includes a trialing subscription and uses its expiration in checkout messaging', async () => {
    const defaultGet = apiClient.api.get.getMockImplementation();
    const trialPlan = { id: 'trial-plan', name: 'Trial', price_usd: 5, duration_in_days: 7 };
    apiClient.api.get.mockImplementation(async (url, config) => {
      if (url === '/users') {
        return {
          data: {
            subscription_expires: '2000-01-01T00:00:00Z',
          },
        };
      }
      if (url === '/subscriptions') {
        return {
          data: [
            {
              id: 'trial-subscription',
              status: 'trialing',
              plan: trialPlan,
              expires_at: '2030-06-15T00:00:00Z',
            },
          ],
        };
      }
      return defaultGet(url, config);
    });

    renderCheckout();

    expect(await screen.findByText(/Trial/)).toBeInTheDocument();
    const subscriptionMessage = screen.getByText(/expiring/i);
    expect(subscriptionMessage).toHaveTextContent('expiring 6/15/2030');
    expect(subscriptionMessage).not.toHaveTextContent('1/1/2000');
  });

  it('navigates to /payment/:invoiceId after the invoice is created', async () => {
    apiClient.api.post.mockResolvedValue({ data: { id: 'inv-9', status: 'pending' } });

    renderCheckout();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /generate bitcoin invoice/i }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/payment/inv-9');
    expect(apiClient.api.post).toHaveBeenCalledWith('/invoices', {
      plan_id: 'plan-1',
      payment_method: 'lightning',
      fiat_currency: 'USD',
    });
  });

  it('renders an unavailable-plan state with a way back when the plan cannot be loaded', async () => {
    apiClient.api.get.mockImplementation(async (url) => {
      if (url === '/users') return { data: { plan: null } };
      return Promise.reject(new Error('not found'));
    });

    renderCheckout('gone');

    expect(await screen.findByText(/plan is unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to plans/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /generate bitcoin invoice/i })
    ).not.toBeInTheDocument();
  });

  it('lets the customer pick a billing currency that drives quotes and the invoice', async () => {
    apiClient.api.post.mockResolvedValue({ data: { id: 'inv-eur', status: 'pending' } });

    renderCheckout();
    const user = userEvent.setup();

    await screen.findByText('Standard');

    await user.click(screen.getByRole('button', { name: 'EUR' }));

    // Switching currency re-quotes crypto prices in the selected fiat...
    expect(apiClient.api.get).toHaveBeenCalledWith('/crypto/prices', {
      params: { fiat_currency: 'EUR' },
    });

    await user.click(screen.getByRole('button', { name: /generate bitcoin invoice/i }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/payment/inv-eur');
    // ...and locks the chosen currency onto the invoice payload.
    expect(apiClient.api.post).toHaveBeenCalledWith('/invoices', {
      plan_id: 'plan-1',
      payment_method: 'lightning',
      fiat_currency: 'EUR',
    });
  });

  it('renders order amounts in the selected billing currency at the FX rate', async () => {
    renderCheckout();

    // USD checkout: pass-through, no FX call.
    expect((await screen.findAllByText('$10.00')).length).toBeGreaterThan(0);
    expect(apiClient.api.get).not.toHaveBeenCalledWith('/crypto/fx-rate', {
      params: { fiat_currency: 'USD' },
    });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'GBP' }));

    // 10 USD converted at 0.80 USD-per-GBP -> £12.50, with the base price
    // shown as a USD reference line instead of being relabeled as GBP.
    expect((await screen.findAllByText('£12.50')).length).toBeGreaterThan(0);
    expect(await screen.findAllByText('≈ $10.00')).not.toHaveLength(0);
  });

  it('requests an FX rate for the selected non-USD billing currency', async () => {
    renderCheckout();
    const user = userEvent.setup();

    await screen.findByText('Standard');
    await user.click(screen.getByRole('button', { name: 'EUR' }));

    expect(apiClient.api.get).toHaveBeenCalledWith('/crypto/fx-rate', {
      params: { fiat_currency: 'EUR' },
    });
  });
});
