import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useSubscriptions } from '@/features/admin/hooks/useSubscriptions';
import SubscriptionList from './SubscriptionList';

vi.mock('@/features/admin/hooks/useSubscriptions', () => ({ useSubscriptions: vi.fn() }));

const subscriptions = [
  {
    id: 's1',
    status: 'active',
    started_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-02-01T00:00:00Z',
    user_id: 'u1',
    plan: { name: 'Pro' },
  },
  {
    id: 's2',
    status: 'expired',
    started_at: null,
    expires_at: null,
    user_id: null,
    plan_id: 'p7',
  },
];

describe('SubscriptionList (admin)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <SubscriptionList />
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders subscription rows with owner links and fallbacks', () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: { data: subscriptions, total_count: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Subscription Management' })).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    // Missing plan object falls back to the plan-id label.
    expect(screen.getByText('Plan #p7')).toBeInTheDocument();
  });

  it('shows the empty state message', () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: { data: [], total_count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/no subscriptions found matching/i)).toBeInTheDocument();
  });
});
