import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useUserSubscriptions } from '@/features/dashboard/hooks/useDashboard';
import SubscriptionList from './SubscriptionList';

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  useUserSubscriptions: vi.fn(),
}));

const subscriptions = [
  {
    id: 's1',
    status: 'active',
    expires_at: '2026-02-01T00:00:00Z',
    plan: { name: 'Pro', billing_cycle: 'monthly', price_usd: 10 },
  },
  {
    id: 's2',
    status: 'expired',
    expires_at: '2026-01-01T00:00:00Z',
    plan: { name: 'Starter', billing_cycle: 'monthly', price_usd: 5 },
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <SubscriptionList />
    </MemoryRouter>
  );

describe('SubscriptionList (dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loader while subscriptions boot', () => {
    vi.mocked(useUserSubscriptions).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders summary counts and subscription rows with a details action', async () => {
    vi.mocked(useUserSubscriptions).mockReturnValue({
      data: subscriptions,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = (await import('@testing-library/user-event')).default.setup();
    renderPage();

    expect(screen.getByText('Total Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /details/i })[0]);
  });

  it('surfaces API failures through the shared alert', () => {
    vi.mocked(useUserSubscriptions).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the empty state when there are no subscriptions', () => {
    vi.mocked(useUserSubscriptions).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/no active or past subscriptions found/i)).toBeInTheDocument();
  });
});
