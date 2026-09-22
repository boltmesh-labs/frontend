import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useToggleVpnDeviceStatus, useVpnDeviceDetail } from '@/features/admin/hooks/useVpnDevices';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import VpnDeviceDetail from './VpnDeviceDetail';

vi.mock('@/features/admin/hooks/useVpnDevices', () => ({
  useVpnDeviceDetail: vi.fn(),
  useToggleVpnDeviceStatus: vi.fn(),
}));

vi.mock('@/features/admin/hooks/useUsers', () => ({
  useUserDetail: vi.fn(),
}));

const device = {
  id: 'd1',
  name: 'phone-1',
  platform: 'android',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  user_id: 'u1',
  subscription: { id: 's1' },
  peers: [
    {
      id: 'peer1',
      public_key: 'pk=',
      assigned_ip: '10.7.0.2',
      server_id: 'srv1',
      is_active: true,
      is_connected: false,
      tx_bytes: 1024,
      rx_bytes: 2048,
    },
    {
      id: 'peer2',
      public_key: null,
      assigned_ip: null,
      server_id: null,
      is_active: false,
      is_connected: true,
    },
  ],
};

describe('VpnDeviceDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToggleVpnDeviceStatus).mockReturnValue({ mutate: vi.fn(), isPending: false });
    vi.mocked(useVpnDeviceDetail).mockReturnValue({
      data: device,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useUserDetail).mockReturnValue({
      data: { id: 'u1', username: 'amy', email: 'amy@x.io' },
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/admin/vpn-devices/d1']}>
        <Routes>
          <Route path="/admin/vpn-devices/:id" element={<VpnDeviceDetail />} />
        </Routes>
      </MemoryRouter>
    );

  it('renders the summary, linked cards and associated peer table', () => {
    renderPage();

    expect(screen.getByText('VPN Device')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate device' })).toBeInTheDocument();
    expect(screen.getAllByText(/associated peers/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'peer1' })).toHaveAttribute(
      'href',
      '/admin/vpn-devices/peer/peer1'
    );
    // Peer without a key shows the em-dash placeholder.
    const peer2row = screen.getByRole('link', { name: 'peer2' }).closest('tr');
    expect(peer2row.textContent).toContain('—');
    expect(screen.getByRole('link', { name: 'amy' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 's1' })).toHaveAttribute(
      'href',
      '/admin/subscriptions/s1'
    );
    expect(screen.getByRole('link', { name: 'srv1' })).toHaveAttribute(
      'href',
      '/admin/vpn-servers/srv1'
    );
  });
});
