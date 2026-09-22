import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  useCancelSubscription,
  useSubscriptionDetail,
  useSubscriptionDevices,
  useSubscriptionInvoices,
} from '@/features/admin/hooks/useSubscriptions';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import SubscriptionDetail from './SubscriptionDetail';

vi.mock('@/features/admin/hooks/useSubscriptions', () => ({
  useSubscriptionDetail: vi.fn(),
  useCancelSubscription: vi.fn(),
  useSubscriptionDevices: vi.fn(),
  useSubscriptionInvoices: vi.fn(),
}));
vi.mock('@/features/admin/hooks/useUsers', () => ({ useUserDetail: vi.fn() }));

const subscription = {
  id: 's1',
  status: 'active',
  plan_id: 'p1',
  plan: { id: 'p1', name: 'Pro' },
  started_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-02-01T00:00:00Z',
  user_id: 'u1',
  devices: [
    {
      id: 'd1',
      name: 'phone',
      platform: 'android',
      is_active: true,
    },
  ],
  invoices: [
    { id: 'inv1', status: 'paid', payment_method: 'lightning', amount_paid: 10, currency: 'USD' },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/subscriptions/s1']}>
      <Routes>
        <Route path="/admin/subscriptions/:id" element={<SubscriptionDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('SubscriptionDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCancelSubscription).mockReturnValue({ mutate: vi.fn(), isPending: false });
    vi.mocked(useSubscriptionDevices).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useSubscriptionInvoices).mockReturnValue({
      data: [],
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
  });

  it('renders summary, owner card, devices and invoice history with cancel action', () => {
    vi.mocked(useSubscriptionDetail).mockReturnValue({
      data: subscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useSubscriptionDevices).mockReturnValue({
      data: subscription.devices,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useSubscriptionInvoices).mockReturnValue({
      data: subscription.invoices,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancel subscription immediately' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#p1' })).toHaveAttribute('href', '/admin/plans/p1');
    expect(screen.getByRole('link', { name: 'inv1' })).toHaveAttribute(
      'href',
      '/admin/invoices/inv1'
    );
    expect(screen.getAllByText(/vpn devices/i).length).toBeGreaterThan(0);
  });

  it('hides the cancel action for already-canceled subscriptions', () => {
    vi.mocked(useSubscriptionDetail).mockReturnValue({
      data: { ...subscription, status: 'canceled', canceled_at: '2026-03-01T00:00:00Z' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(
      screen.queryByRole('button', { name: 'Cancel subscription immediately' })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/canceled on/i)).toBeInTheDocument();
  });
});
