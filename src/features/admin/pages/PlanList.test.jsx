import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { usePlans, useTogglePlanStatus } from '@/features/admin/hooks/usePlans';
import PlanList from './PlanList';

vi.mock('@/features/admin/hooks/usePlans', () => ({
  usePlans: vi.fn(),
  useTogglePlanStatus: vi.fn(),
}));

const plans = [
  {
    id: 'p1',
    name: 'Standard',
    tier: 'standard',
    price_usd: 10,
    billing_cycle: 'monthly',
    duration_in_days: 30,
    max_devices: 3,
    enabled: true,
    popular: true,
    features: ['Fast tunnels', '5 regions'],
  },
  {
    id: 'p2',
    name: 'Legacy',
    tier: 'legacy',
    price_usd: 2,
    billing_cycle: 'yearly',
    duration_in_days: 365,
    max_devices: 1,
    enabled: false,
    savings: 20,
    features: [],
  },
];

describe('PlanList (admin)', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <PlanList />
      </MemoryRouter>
    );

  let toggle;

  beforeEach(() => {
    vi.clearAllMocks();
    toggle = vi.fn();
    vi.mocked(useTogglePlanStatus).mockReturnValue({
      mutate: toggle,
      isPending: false,
      variables: null,
    });
    vi.mocked(usePlans).mockReturnValue({
      data: plans,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders plan cards-in-table with badges and enable/disable actions', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Subscription Plans' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Standard' })).toHaveAttribute(
      'href',
      '/admin/plans/p1'
    );
    expect(screen.getAllByText(/popular/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Save 20%')).toBeInTheDocument();
    expect(screen.getByText('3 devices')).toBeInTheDocument();
    expect(screen.getByText('2 features')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);

    const createLink = screen.getByText('➕ Create New Plan').closest('a');
    expect(createLink).toHaveAttribute('href', '/admin/plans/new');
    expect(createLink.querySelector('button')).not.toBeInTheDocument();

    // Toggling routes through the confirmation dialog.
    await user.click(screen.getByRole('button', { name: 'Disable' }));
    expect(await screen.findByText('Disable Subscription Plan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disable Plan' }));
    expect(toggle).toHaveBeenCalledWith({ id: 'p1', enabled: true });
  });

  it('shows the empty state when no plans exist', () => {
    vi.mocked(usePlans).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/no subscription plans found/i)).toBeInTheDocument();
  });
});
