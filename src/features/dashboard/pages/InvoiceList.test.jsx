import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { usePublicPlans, useUserInvoices } from '@/features/dashboard/hooks/useDashboard';
import InvoiceList from './InvoiceList';

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  usePublicPlans: vi.fn(),
  useUserInvoices: vi.fn(),
}));

const invoices = [
  {
    id: 'inv1',
    status: 'pending',
    payment_method: 'lightning',
    plan_id: 'p1',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inv2',
    status: 'paid',
    payment_method: 'monero',
    plan_id: 'missing',
    created_at: '2026-02-01T00:00:00Z',
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <InvoiceList />
    </MemoryRouter>
  );

describe('InvoiceList (dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePublicPlans).mockReturnValue({ data: [{ id: 'p1', name: 'Pro' }] });
  });

  it('renders invoice rows with plan names and fallbacks', () => {
    vi.mocked(useUserInvoices).mockReturnValue({
      data: { data: invoices, total_count: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('heading', { name: /invoices & billing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'inv1' })).toHaveAttribute('href', '/invoices/inv1');
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Plan #missing')).toBeInTheDocument();
  });

  it('surfaces API failures through the shared alert', () => {
    vi.mocked(useUserInvoices).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
