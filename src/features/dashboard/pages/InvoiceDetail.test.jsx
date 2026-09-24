import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  useCancelInvoice,
  usePlanDetail,
  useUserInvoiceDetail,
} from '@/features/dashboard/hooks/useDashboard';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import InvoiceDetail from './InvoiceDetail';

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  useCancelInvoice: vi.fn(),
  usePlanDetail: vi.fn(),
  useUserInvoiceDetail: vi.fn(),
}));

vi.mock('@/hooks/useConfirmAction', () => ({
  useConfirmAction: vi.fn(),
}));

vi.mock('@/hooks/useCountdown', () => ({
  useCountdown: vi.fn(() => ({ remainingMs: 60000, expired: false })),
}));

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
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
  payment_uri: 'lightning:lnbc1',
  created_at: '2026-01-01T00:00:00Z',
  expires_at: '2999-01-01T00:00:00Z',
  plan_id: 'p1',
  payments: [
    {
      id: 'pay1',
      status: 'processing',
      external_tx_id: 'tx-1',
      amount: 10,
      confirmations: 1,
      fee: 0,
      created_at: '2026-01-02T00:00:00Z',
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/invoices/inv1']}>
      <Routes>
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices" element={<div>Invoices page</div>} />
        <Route path="/payment/:invoiceId" element={<div>Payment page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('InvoiceDetail (dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlanDetail).mockReturnValue({ data: { name: 'Pro' } });
    vi.mocked(useConfirmAction).mockReturnValue({
      runConfirmed: vi.fn(),
      busy: null,
      confirmDialog: null,
    });
    vi.mocked(useCancelInvoice).mockReturnValue({ mutateAsync: vi.fn() });
  });

  it('renders metadata, deposit details, and payment history for pending invoices', async () => {
    vi.mocked(useUserInvoiceDetail).mockReturnValue({
      data: invoice,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: /invoice details/i })).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('bc1q-addr')).toBeInTheDocument();
    expect(screen.getAllByText('tx-1')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /^pay$/i }));
    expect(await screen.findByText('Payment page')).toBeInTheDocument();
  });

  it('routes the cancel action through the confirm runner', async () => {
    const runConfirmed = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useConfirmAction).mockReturnValue({ runConfirmed, busy: null, confirmDialog: null });
    const mutateAsync = vi.fn().mockResolvedValue('inv1');
    vi.mocked(useCancelInvoice).mockReturnValue({ mutateAsync });
    vi.mocked(useUserInvoiceDetail).mockReturnValue({
      data: invoice,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(runConfirmed).toHaveBeenCalledWith(
      'cancel-invoice',
      expect.objectContaining({ title: 'Cancel Invoice' })
    );

    // The confirmed callback cancels the invoice by route param.
    const opts = runConfirmed.mock.calls[0][1];
    await opts.run();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('inv1'));
  });

  it('drops pay/cancel affordances once the invoice is paid', () => {
    vi.mocked(useUserInvoiceDetail).mockReturnValue({
      data: { ...invoice, status: 'paid', paid_at: '2026-01-03T00:00:00Z' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.queryByRole('button', { name: /^pay$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/paid on/i)).toBeInTheDocument();
  });

  it('renders the not-found fallback when the invoice is missing', () => {
    vi.mocked(useUserInvoiceDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/invoice not found/i)).toBeInTheDocument();
  });
});
