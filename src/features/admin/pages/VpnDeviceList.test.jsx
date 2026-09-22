import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useToggleVpnDeviceStatus, useVpnDevices } from '@/features/admin/hooks/useVpnDevices';
import VpnDeviceList from './VpnDeviceList';

vi.mock('@/features/admin/hooks/useVpnDevices', () => ({
  useVpnDevices: vi.fn(),
  useToggleVpnDeviceStatus: vi.fn(),
}));

const devices = [
  {
    id: 'd1',
    name: 'phone-1',
    platform: 'android',
    is_active: true,
    subscription_id: 's1',
    user_id: 'u1',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'd2',
    name: null,
    platform: 'ios',
    is_active: false,
    subscription_id: null,
    user_id: null,
    created_at: '2026-02-01T00:00:00Z',
  },
];

describe('VpnDeviceList (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToggleVpnDeviceStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: null,
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <VpnDeviceList />
      </MemoryRouter>
    );

  it('renders device rows with subscription/owner links and fallbacks', () => {
    vi.mocked(useVpnDevices).mockReturnValue({
      data: { data: devices, total_count: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('heading', { name: 'VPN Devices' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /d1/ })).toHaveAttribute(
      'href',
      '/admin/vpn-devices/d1'
    );
    expect(screen.getByRole('link', { name: 's1' })).toHaveAttribute(
      'href',
      '/admin/subscriptions/s1'
    );
    // The second row exercises the em-dash fallbacks for missing fields.
    const d2row = screen.getByRole('link', { name: /d2/ }).closest('tr');
    expect(d2row.textContent).toContain('—');
  });

  it('surfaces failures through the alert region', () => {
    vi.mocked(useVpnDevices).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
