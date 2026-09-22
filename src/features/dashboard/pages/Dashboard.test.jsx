import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useDashboardProfile, useResendActivation } from '@/features/dashboard/hooks/useDashboard';
import Dashboard from './Dashboard';

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  useDashboardProfile: vi.fn(),
  useResendActivation: vi.fn(),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useResendActivation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('shows the loader while the profile boots', () => {
    vi.mocked(useDashboardProfile).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderPage();

    expect(screen.queryByText(/account dashboard/i)).not.toBeInTheDocument();
  });

  it('greets the verified user with their active plan', () => {
    vi.mocked(useDashboardProfile).mockReturnValue({
      data: {
        username: 'amy',
        email: 'amy@x.io',
        is_verified: true,
        active_subscription: {
          plan: { name: 'Pro' },
          expires_at: '2999-06-01T00:00:00Z',
        },
      },
      isLoading: false,
      isError: false,
    });
    renderPage();

    expect(screen.getByText('Account Dashboard')).toBeInTheDocument();
    expect(screen.getByText('amy')).toBeInTheDocument();
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /change plan/i })).toBeEnabled();
    expect(screen.queryByText(/needs verification/i)).not.toBeInTheDocument();
  });

  it('offers the resend-verification path to unverified users without a plan', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useResendActivation).mockReturnValue({ mutateAsync, isPending: false });
    vi.mocked(useDashboardProfile).mockReturnValue({
      data: { username: 'bob', email: 'b@x.io', is_verified: false },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/needs verification/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose a vpn plan/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /resend verification email/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it('prompts users without a current subscription to choose a plan', () => {
    vi.mocked(useDashboardProfile).mockReturnValue({
      data: { username: 'amy', is_verified: true },
      isLoading: false,
      isError: false,
    });
    renderPage();

    expect(screen.getByText(/do not have an active vpn plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose a vpn plan/i })).toBeInTheDocument();
  });
});
