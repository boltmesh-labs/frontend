import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { usePublicPlans } from '@/features/dashboard/hooks/useDashboard';
import BuyPlan from './BuyPlan';

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  usePublicPlans: vi.fn(),
}));

const plans = [
  {
    id: 'p1',
    name: 'Starter',
    description: 'Starter plan',
    price_usd: 5,
    duration_in_days: 30,
    max_devices: 1,
    features: ['Fast servers'],
    enabled: true,
    popular: false,
  },
  {
    id: 'p2',
    name: 'Pro',
    description: 'Pro plan',
    price_usd: 10,
    duration_in_days: 30,
    max_devices: 3,
    features: ['Fast servers', 'Priority support'],
    enabled: true,
    popular: true,
    billing_cycle: 'monthly',
    savings: 20,
  },
  {
    id: 'p3',
    name: 'Retired',
    description: 'Disabled plan',
    price_usd: 1,
    duration_in_days: 7,
    max_devices: 1,
    features: [],
    enabled: false,
  },
];

const renderPage = (initialEntries = ['/buy-plan']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/buy-plan" element={<BuyPlan />} />
        <Route path="/checkout/:planId" element={<div>Checkout page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('BuyPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loader while plans boot', () => {
    vi.mocked(usePublicPlans).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    renderPage();

    expect(screen.getByText(/loading available plans/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /select plan/i })).not.toBeInTheDocument();
  });

  it('surfaces API failures through the shared alert', () => {
    vi.mocked(usePublicPlans).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    });
    renderPage();

    expect(screen.getByText(/failed to load available plans/i)).toBeInTheDocument();
  });

  it('shows the empty state when no enabled plans exist', () => {
    vi.mocked(usePublicPlans).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderPage();

    expect(screen.getByText(/no plans are currently available/i)).toBeInTheDocument();
  });

  it('renders enabled plans, flags the popular one, and navigates to checkout', async () => {
    vi.mocked(usePublicPlans).mockReturnValue({
      data: plans,
      isLoading: false,
      isError: false,
      error: null,
    });
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.queryByText('Retired')).not.toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    expect(screen.getByText(/save 20%/i)).toBeInTheDocument();
    // Singular vs plural device copy.
    expect(document.body.textContent).toMatch(/1\s*Device\b/);
    expect(document.body.textContent).toMatch(/3\s*Devices/);

    const selectButtons = screen.getAllByRole('button', { name: /select plan/i });
    expect(selectButtons).toHaveLength(2);
    await user.click(selectButtons[1]);
    expect(await screen.findByText('Checkout page')).toBeInTheDocument();
  });

  it('returns to the dashboard', async () => {
    vi.mocked(usePublicPlans).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /return to dashboard/i }));
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });
});
