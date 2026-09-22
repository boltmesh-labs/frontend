import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { usePaymentDetail } from '@/features/admin/hooks/usePayments';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import PaymentDetail from './PaymentDetail';

vi.mock('@/features/admin/hooks/usePayments', () => ({ usePaymentDetail: vi.fn() }));
vi.mock('@/features/admin/hooks/useUsers', () => ({ useUserDetail: vi.fn() }));

const payment = {
  id: 'pay1',
  status: 'succeeded',
  amount: 0.001,
  fee: 0.00001,
  confirmations: 3,
  external_tx_id: 'tx-hash-123',
  invoice_id: 'inv1',
  created_at: '2026-01-01T00:00:00Z',
  invoice: {
    payment_method: 'lightning',
    currency: 'btc',
    user_id: 'u1',
  },
};

const user = { id: 'u1', username: 'amy', email: 'amy@x.io' };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/payments/pay1']}>
      <Routes>
        <Route path="/admin/payments/:id" element={<PaymentDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('PaymentDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settlement summary with confirmations, fee and linked cards', () => {
    vi.mocked(usePaymentDetail).mockReturnValue({
      data: payment,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useUserDetail).mockReturnValue({
      data: user,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Settlement Status')).toBeInTheDocument();
    expect(screen.getByText('3 confirmations')).toBeInTheDocument();
    expect(screen.getAllByText(/processing fee/i).length).toBeGreaterThan(0);
    expect(screen.getByText('tx-hash-123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'inv1' })).toHaveAttribute(
      'href',
      '/admin/invoices/inv1'
    );
    expect(screen.getByRole('link', { name: 'amy' })).toBeInTheDocument();
  });

  it('omits optional fields when absent and falls back to the system owner card', () => {
    vi.mocked(usePaymentDetail).mockReturnValue({
      data: {
        ...payment,
        external_tx_id: null,
        confirmations: null,
        invoice: {
          payment_method: 'monero',
          currency: 'USD',
          user_id: null,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useUserDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.queryByText('tx-hash-123')).not.toBeInTheDocument();
    expect(screen.queryByText(/confirmations/i)).not.toBeInTheDocument();
    // AccountOwnerCard still renders via the fallback user context.
    expect(screen.getByText('User Profile')).toBeInTheDocument();
  });
});
