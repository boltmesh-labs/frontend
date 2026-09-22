import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  useCancelUserSubscription,
  useUserDevicesBySubscription,
  useUserInvoicesBySubscription,
  useUserSubscriptionDetail,
} from '@/features/dashboard/hooks/useDashboard';
import { useConfirm } from '@/hooks/useConfirm';
import SubscriptionDetail from './SubscriptionDetail';

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  useUserSubscriptionDetail: vi.fn(),
  useCancelUserSubscription: vi.fn(),
  useUserInvoicesBySubscription: vi.fn(),
  useUserDevicesBySubscription: vi.fn(),
}));

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: vi.fn(),
}));

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

const subscription = {
  id: 's1',
  status: 'active',
  plan_id: 'p1',
  plan: {
    id: 'p1',
    name: 'Pro',
    price_usd: 10,
    billing_cycle: 'monthly',
    duration_in_days: 30,
    max_devices: 3,
    features: ['Fast servers'],
  },
  started_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-02-01T00:00:00Z',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/subscriptions/s1']}>
      <Routes>
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="/subscriptions" element={<div>Subscriptions page</div>} />
        <Route path="/checkout/:planId" element={<div>Checkout page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('SubscriptionDetail (dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfirm).mockReturnValue({ confirm: vi.fn(), confirmDialog: null });
    vi.mocked(useCancelUserSubscription).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    vi.mocked(useUserInvoicesBySubscription).mockReturnValue({
      data: [
        {
          id: 'inv1',
          status: 'paid',
          amount_requested: 10,
          currency: 'USD',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
    });
    vi.mocked(useUserDevicesBySubscription).mockReturnValue({
      data: [{ id: 'd1', name: 'phone', platform: 'android', created_at: '2026-01-02T00:00:00Z' }],
      isLoading: false,
    });
  });

  it('renders the plan summary with invoices, devices, and actions', async () => {
    vi.mocked(useUserSubscriptionDetail).mockReturnValue({
      data: subscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: /subscription details/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByText('inv1')).toBeInTheDocument();
    expect(screen.getByText('phone')).toBeInTheDocument();
    expect(screen.getByText(/slots: 1 \/ 3/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /extend plan/i }));
    expect(await screen.findByText('Checkout page')).toBeInTheDocument();
  });

  it('cancels behind the confirm dialog', async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const mutate = vi.fn();
    vi.mocked(useConfirm).mockReturnValue({ confirm, confirmDialog: null });
    vi.mocked(useCancelUserSubscription).mockReturnValue({ mutate, isPending: false });
    vi.mocked(useUserSubscriptionDetail).mockReturnValue({
      data: subscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /cancel subscription/i }));
    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cancel Subscription' })
      )
    );
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('s1'));
  });

  it('skips cancellation when the dialog is declined', async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const mutate = vi.fn();
    vi.mocked(useConfirm).mockReturnValue({ confirm, confirmDialog: null });
    vi.mocked(useCancelUserSubscription).mockReturnValue({ mutate, isPending: false });
    vi.mocked(useUserSubscriptionDetail).mockReturnValue({
      data: subscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /cancel subscription/i }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(mutate).not.toHaveBeenCalled();
  });

  it('hides the cancel action for already-canceled subscriptions', () => {
    vi.mocked(useUserSubscriptionDetail).mockReturnValue({
      data: { ...subscription, status: 'canceled', canceled_at: '2026-03-01T00:00:00Z' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.queryByRole('button', { name: /cancel subscription/i })).not.toBeInTheDocument();
    expect(screen.getByText(/canceled on/i)).toBeInTheDocument();
  });

  it('renders the not-found fallback when the subscription is missing', () => {
    vi.mocked(useUserSubscriptionDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/subscription not found/i)).toBeInTheDocument();
  });
});
