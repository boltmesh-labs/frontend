import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { copyToClipboard } from '@/utils/clipboard';
import { usePayments } from '@/features/admin/hooks/usePayments';
import PaymentList from './PaymentList';

vi.mock('@/features/admin/hooks/usePayments', () => ({ usePayments: vi.fn() }));
vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

const payments = [
  {
    id: 'pay1',
    invoice_id: 'inv1',
    status: 'succeeded',
    amount: 0.001,
    external_tx_id: 'abcdefghijklmnopqrstuvwxyz', // long txid triggers truncation
    created_at: '2026-01-01T00:00:00Z',
    invoice: { payment_method: 'lightning', currency: 'btc' },
  },
  {
    id: 'pay2',
    invoice_id: 'inv2',
    status: 'failed',
    amount: 5,
    external_tx_id: null, // missing txid exercises the em-dash branch
    created_at: '2026-02-01T00:00:00Z',
    invoice: null,
  },
];

describe('PaymentList (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <PaymentList />
      </MemoryRouter>
    );

  it('renders ledger rows with truncated txids and copy affordances', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    vi.mocked(usePayments).mockReturnValue({
      data: { data: payments, total_count: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Payments Management' })).toBeInTheDocument();
    expect(screen.getByTitle('abcdefghijklmnopqrstuvwxyz')).toHaveTextContent('abcde...uvwxyz');
    expect(screen.getByRole('link', { name: 'pay1' })).toHaveAttribute(
      'href',
      '/admin/payments/pay1'
    );

    await user.click(screen.getByTitle('Copy TXID to Clipboard'));
    expect(copyToClipboard).toHaveBeenCalledWith('abcdefghijklmnopqrstuvwxyz');
  });

  it('shows the empty state when no payments match', () => {
    vi.mocked(usePayments).mockReturnValue({
      data: { data: [], total_count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/no matching payments found/i)).toBeInTheDocument();
  });
});
