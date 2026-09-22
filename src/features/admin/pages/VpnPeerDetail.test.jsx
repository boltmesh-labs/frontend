import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useVpnPeerDetail } from '@/features/admin/hooks/useVpnPeers';
import VpnPeerDetail from './VpnPeerDetail';

vi.mock('@/features/admin/hooks/useVpnPeers', () => ({
  useVpnPeerDetail: vi.fn(),
}));

const peer = {
  id: 'peer1',
  is_active: true,
  is_connected: true,
  assigned_ip: '10.7.0.2',
  public_key: 'peer-pubkey=',
  tx_bytes: 1024,
  rx_bytes: 2048,
  device_id: 'd1',
  server_id: 'srv1',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/vpn-devices/peer/peer1']}>
      <Routes>
        <Route path="/admin/vpn-devices/peer/:id" element={<VpnPeerDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('VpnPeerDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders peer status, traffic and linked device details', async () => {
    vi.mocked(useVpnPeerDetail).mockReturnValue({
      data: peer,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText('VPN Peer')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('1 KB / 2 KB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'd1' })).toHaveAttribute(
      'href',
      '/admin/vpn-devices/d1'
    );
    expect(screen.getByRole('link', { name: 'srv1' })).toHaveAttribute(
      'href',
      '/admin/vpn-servers/srv1'
    );
    expect(screen.getByText('peer-pubkey=')).toBeInTheDocument();
  });
});
