import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useToggleVpnRegionStatus, useVpnRegions } from '@/features/admin/hooks/useVpnRegions';
import VpnRegionList from './VpnRegionList';

vi.mock('@/features/admin/hooks/useVpnRegions', () => ({
  useVpnRegions: vi.fn(),
  useToggleVpnRegionStatus: vi.fn(),
}));

const regions = [
  {
    id: 'r1',
    name: 'Frankfurt',
    country_code: 'DE',
    is_active: true,
  },
  {
    id: 'r2',
    name: 'Ashburn',
    country_code: 'US',
    is_active: false,
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <VpnRegionList />
    </MemoryRouter>
  );

describe('VpnRegionList (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToggleVpnRegionStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: null,
    });
    vi.mocked(useVpnRegions).mockReturnValue({
      data: { data: regions, total_count: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('toggles region status from the row switch', async () => {
    const toggle = vi.fn();
    vi.mocked(useToggleVpnRegionStatus).mockReturnValue({
      mutate: toggle,
      isPending: false,
      variables: null,
    });
    const user = userEvent.setup();
    renderPage();

    const createLink = screen.getByText('➕ Create New Region').closest('a');
    expect(createLink).toHaveAttribute('href', '/admin/vpn-regions/new');
    expect(createLink.querySelector('button')).not.toBeInTheDocument();

    // The switch routes through the shared confirmation dialog first.
    await user.click(screen.getByLabelText('Toggle active status for Frankfurt'));
    expect(
      await screen.findByText(/are you sure you want to deactivate this vpn region/i)
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
    expect(toggle).toHaveBeenCalledWith({ id: 'r1', isActive: true });
  });
});
