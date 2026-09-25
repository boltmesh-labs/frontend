import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import Payment from './Payment';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { get: vi.fn() },
  },
}));

const invoice = {
  id: 'inv-1',
  status: 'pending',
  plan: { id: 'plan-1', name: 'Standard', price_usd: 10 },
  payment_method: 'lightning',
  currency: 'btc',
  amount_requested: 0.0001,
  crypto_address: 'bc1q-test-address',
  payment_uri: 'lightning:lnbc1test',
  expires_at: '2999-01-01T00:00:00Z',
};

const renderPayment = (invoiceId) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/payment/${invoiceId}`]}>
        <Routes>
          <Route path="/payment/:invoiceId" element={<Payment />} />
          <Route path="/invoices" element={<div>Invoices page</div>} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the invoice by route param and renders payment details', async () => {
    apiClient.api.get.mockImplementation(async (url) => {
      if (url === '/invoices/inv-1') return { data: invoice };
      if (url === '/plans/plan-1') return { data: invoice.plan };
      if (url === '/invoices/inv-1/status') {
        return {
          data: { status: 'pending', amount_requested: 0.0001, amount_paid: 0 },
        };
      }
      return { data: {} };
    });

    renderPayment('inv-1');

    const paymentAddress = await screen.findByLabelText(/lightning Address/i);
    expect(paymentAddress).toHaveValue('bc1q-test-address');
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check status/i })).toBeInTheDocument();
  });

  it('does not make an unsupported payment URI clickable', async () => {
    const unsafeInvoice = { ...invoice, payment_uri: 'javascript:alert(1)' };
    apiClient.api.get.mockImplementation(async (url) => {
      if (url === '/invoices/inv-1') return { data: unsafeInvoice };
      if (url === '/plans/plan-1') return { data: unsafeInvoice.plan };
      if (url === '/invoices/inv-1/status') {
        return { data: { status: 'pending', amount_requested: 0.0001, amount_paid: 0 } };
      }
      return { data: {} };
    });

    renderPayment('inv-1');

    expect(await screen.findByText(/wallet link unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open in native wallet/i })).toBeDisabled();
  });

  it('renders a not-found state instead of redirecting when the invoice cannot be loaded', async () => {
    apiClient.api.get.mockRejectedValue(new Error('not found'));

    renderPayment('missing');

    expect(await screen.findByText(/could not load this invoice/i)).toBeInTheDocument();
    // react-bootstrap Buttons rendered via `as={Link}` expose role="button".
    expect(screen.getByRole('button', { name: /my invoices/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    // The payment card must never render without an invoice behind it.
    expect(screen.queryByRole('button', { name: /check status/i })).not.toBeInTheDocument();
  });
});
