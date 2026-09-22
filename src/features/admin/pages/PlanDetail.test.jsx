import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import {
  useCreatePlan,
  useDeletePlan,
  usePlanDetail,
  useUpdatePlan,
} from '@/features/admin/hooks/usePlans';
import PlanDetail from './PlanDetail';

vi.mock('@/features/admin/hooks/usePlans', () => ({
  usePlanDetail: vi.fn(),
  useCreatePlan: vi.fn(),
  useUpdatePlan: vi.fn(),
  useDeletePlan: vi.fn(),
}));

const planA = {
  id: 'plan-a',
  name: 'Alpha',
  tier: 'standard',
  price_usd: 5,
  billing_cycle: 'monthly',
  duration_in_days: 30,
  max_devices: 5,
  description: 'Alpha description',
  features: ['Speed'],
  savings: '',
  popular: false,
  enabled: true,
};

const planB = {
  ...planA,
  id: 'plan-b',
  name: 'Beta',
  tier: 'premium',
  price_usd: 15,
  description: 'Beta description',
  features: ['Power'],
};

const asQueryResult = (data) => ({ data, isLoading: false, error: null, refetch: vi.fn() });

// Navigation probe: lets a test drive route-param changes while PlanDetail
// stays mounted (exactly what happens on /admin/plans/:id -> /admin/plans/:id).
const NavButton = ({ to }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      {`go:${to}`}
    </button>
  );
};

const renderPlanDetail = (initialPath = '/admin/plans/plan-a') => {
  const ui = (
    <MemoryRouter initialEntries={[initialPath]}>
      <NavButton to="/admin/plans/plan-b" />
      <NavButton to="/admin/plans/new" />
      <Routes>
        <Route path="/admin/plans/:id" element={<PlanDetail />} />
      </Routes>
    </MemoryRouter>
  );
  return { ...render(ui), ui };
};

describe('PlanDetail form syncing', () => {
  beforeEach(() => {
    vi.mocked(usePlanDetail).mockImplementation((id) =>
      asQueryResult(id === 'plan-a' ? planA : id === 'plan-b' ? planB : null)
    );
    const mutationStub = () => ({ isPending: false, mutateAsync: vi.fn() });
    vi.mocked(useCreatePlan).mockImplementation(mutationStub);
    vi.mocked(useUpdatePlan).mockImplementation(mutationStub);
    vi.mocked(useDeletePlan).mockImplementation(mutationStub);
  });

  it('hydrates the form from the fetched plan on first load', async () => {
    renderPlanDetail();

    expect(await screen.findByLabelText('Plan Name')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Price (USD)')).toHaveValue(5);
  });

  // Regression: navigating between two :id routes keeps the same component
  // mounted; previously the form kept showing the previous plan's values.
  it('re-syncs the form when navigating to another plan id', async () => {
    const user = userEvent.setup();
    renderPlanDetail();

    expect(await screen.findByLabelText('Plan Name')).toHaveValue('Alpha');

    await user.click(screen.getByRole('button', { name: 'go:/admin/plans/plan-b' }));

    await waitFor(() => expect(screen.getByLabelText('Plan Name')).toHaveValue('Beta'));
    expect(screen.getByLabelText('Price (USD)')).toHaveValue(15);
  });

  it('resets to an empty create form when navigating to /new', async () => {
    const user = userEvent.setup();
    renderPlanDetail();

    expect(await screen.findByLabelText('Plan Name')).toHaveValue('Alpha');

    await user.click(screen.getByRole('button', { name: 'go:/admin/plans/new' }));

    expect(await screen.findByText('Create Subscription Plan')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Plan Identifier/)).toHaveValue('');
    expect(screen.getByLabelText('Plan Name')).toHaveValue('');
  });

  it('preserves in-progress edits across background refetches', async () => {
    const user = userEvent.setup();
    const { ui, rerender } = renderPlanDetail();

    const nameInput = await screen.findByLabelText('Plan Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Edited Name');

    // Background refetch: same route id, brand-new object identities.
    vi.mocked(usePlanDetail).mockImplementation((id) =>
      asQueryResult(id === 'plan-a' ? { ...planA } : null)
    );
    rerender(ui);

    expect(screen.getByLabelText('Plan Name')).toHaveValue('Edited Name');
  });
});
