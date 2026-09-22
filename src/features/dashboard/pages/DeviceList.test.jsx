import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import {
  useDashboardProfile,
  useDeleteDevice,
  useUserDevices,
  useUserSubscriptions,
} from '@/features/dashboard/hooks/useDashboard';
import DeviceList from './DeviceList';

vi.mock('@/features/dashboard/hooks/useDashboard', () => ({
  useUserDevices: vi.fn(),
  useUserSubscriptions: vi.fn(),
  useDashboardProfile: vi.fn(),
  useDeleteDevice: vi.fn(),
}));

const trialPlan = { id: 'trial', name: 'Trial', max_devices: 3 };

const trialingSubscription = { id: 's1', status: 'trialing', plan: trialPlan };
const canceledSubscription = {
  id: 's2',
  status: 'canceled',
  plan: { id: 'old', name: 'Old', max_devices: 9 },
};

describe('DeviceList device-slot meter', () => {
  beforeEach(() => {
    vi.mocked(useUserDevices).mockReturnValue({ data: [], isLoading: false, isError: false });
    vi.mocked(useUserSubscriptions).mockReturnValue({ data: [] });
    vi.mocked(useDashboardProfile).mockReturnValue({ data: {} });
    vi.mocked(useDeleteDevice).mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
  });

  const renderDeviceList = () =>
    render(
      <MemoryRouter>
        <DeviceList />
      </MemoryRouter>
    );

  it('derives the slot ceiling from a trialing subscription when the profile has none', async () => {
    vi.mocked(useUserSubscriptions).mockReturnValue({ data: [trialingSubscription] });
    renderDeviceList();

    expect(await screen.findByText('0 / 3')).toBeInTheDocument();
    expect(screen.getByText(/Trial plan allows up to 3 devices/)).toBeInTheDocument();
  });

  it('renders no slot meter without an active or trialing plan', async () => {
    vi.mocked(useUserSubscriptions).mockReturnValue({ data: [canceledSubscription] });
    renderDeviceList();

    expect(await screen.findByText('No Active Devices')).toBeInTheDocument();
    expect(screen.queryByText(/allows up to/)).not.toBeInTheDocument();
  });

  it('points users at the client app instead of a create action', async () => {
    renderDeviceList();

    expect(await screen.findByText(/created from your client app after login/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add device/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
  });
});
