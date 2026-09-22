import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useInvoices } from '@/features/admin/hooks/useInvoices';
import { usePlans } from '@/features/admin/hooks/usePlans';
import InvoiceList from './InvoiceList';

vi.mock('@/features/admin/hooks/useInvoices', () => ({ useInvoices: vi.fn() }));
vi.mock('@/features/admin/hooks/usePlans', () => ({ usePlans: vi.fn() }));

const invoices = [
  {
    id: 'inv1',
    status: 'pending',
    payment_method: 'lightning',
    created_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
  },
  {
    id: 'inv2',
    status: 'paid',
    payment_method: 'monero',
    created_at: '2026-02-01T00:00:00Z',
    user_id: null,
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <InvoiceList />
    </MemoryRouter>
  );

describe('InvoiceList (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlans).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders invoice rows with owner links or anonymous fallbacks', () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: { data: invoices, total_count: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'inv1' })).toHaveAttribute(
      'href',
      '/admin/invoices/inv1'
    );
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('surfaces API failures through the shared alert', () => {
    vi.mocked(useInvoices).mockReturnValue({
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
