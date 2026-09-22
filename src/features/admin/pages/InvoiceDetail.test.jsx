import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useCancelInvoice, useInvoiceDetail } from '@/features/admin/hooks/useInvoices';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import { usePlanDetail } from '@/features/admin/hooks/usePlans';
import InvoiceDetail from './InvoiceDetail';

vi.mock('@/features/admin/hooks/useInvoices', () => ({
  useInvoiceDetail: vi.fn(),
  useCancelInvoice: vi.fn(),
}));

vi.mock('@/features/admin/hooks/useUsers', () => ({
  useUserDetail: vi.fn(),
}));

vi.mock('@/features/admin/hooks/usePlans', () => ({
  usePlanDetail: vi.fn(),
}));

const invoice = {
  id: 'inv1',
  status: 'pending',
  currency: 'USD',
  amount_requested: 10,
  amount_paid: 0,
  payment_method: 'lightning',
  tracking_id: 'track-1',
  crypto_address: 'bc1q-addr',
  payment_uri: 'lightning:lnbc',
  created_at: '2026-01-01T00:00:00Z',
  expires_at: '2999-01-01T00:00:00Z',
  user_id: 'u1',
  user: { id: 'u1', username: 'amy', email: 'amy@x.io' },
  subscription_id: 's1',
  plan_id: 'p1',
  plan: { name: 'Pro' },
  fiat_currency: 'usd',
  fiat_amount: 10,
  exchange_rate: 1,
  base_amount_usd: 10,
  fx_rate_to_usd: 1,
  subaddress_index: 3,
  payments: [
    {
      id: 'pay1',
      status: 'failed',
      external_tx_id: null,
      amount: 10,
      confirmations: 2,
      fee: 0.1,
      created_at: '2026-01-02T00:00:00Z',
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/invoices/inv1']}>
      <Routes>
        <Route path="/admin/invoices/:id" element={<InvoiceDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('InvoiceDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserDetail).mockReturnValue({ data: undefined });
    vi.mocked(usePlanDetail).mockReturnValue({ data: undefined });
  });

  it('renders summary, copyable fields, owner and payment history for pending invoices', async () => {
    const cancel = vi.fn().mockResolvedValue('inv1');
    vi.mocked(useCancelInvoice).mockReturnValue({ mutateAsync: cancel });
    vi.mocked(useInvoiceDetail).mockReturnValue({
      data: invoice,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useUserDetail).mockReturnValue({ data: invoice.user });
    vi.mocked(usePlanDetail).mockReturnValue({ data: invoice.plan });
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Invoice' })).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getAllByText(/crypto deposit address/i).length).toBeGreaterThan(0);
    expect(screen.getByText('bc1q-addr')).toBeInTheDocument();
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getByText(/subaddress index/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'amy' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 's1' })).toHaveAttribute(
      'href',
      '/admin/subscriptions/s1'
    );
    expect(screen.getByText('2 confirmations')).toBeInTheDocument();

    // Pending invoices expose the cancel action behind confirmation.
    await user.click(screen.getByRole('button', { name: 'Cancel Invoice' }));
    expect(await screen.findByText(/are you sure you want to cancel invoice/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm Cancellation' }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith('inv1'));
  });

  it('drops the cancel affordance once the invoice is no longer pending', () => {
    vi.mocked(useCancelInvoice).mockReturnValue({ mutateAsync: vi.fn() });
    vi.mocked(useInvoiceDetail).mockReturnValue({
      data: { ...invoice, status: 'expired', paid_at: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.queryByRole('button', { name: 'Cancel Invoice' })).not.toBeInTheDocument();
    expect(screen.getAllByText('expired').length).toBeGreaterThan(0);
  });
});
