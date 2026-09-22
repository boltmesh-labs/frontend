import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useToggleVpnServerStatus, useVpnServers } from '@/features/admin/hooks/useVpnServers';
import VpnServerList from './VpnServerList';

vi.mock('@/features/admin/hooks/useVpnServers', () => ({
  useVpnServers: vi.fn(),
  useToggleVpnServerStatus: vi.fn(),
}));

const servers = [
  {
    id: 'srv1',
    name: 'edge-01',
    status: 'online',
    public_ip: '198.51.100.1',
    endpoint: 'node-1.us-east-1.vpn.example.com',
    tunnel_ip: '10.1.0.1/16',
    wg_port: 51820,
    wg_public_key: 'c3VjaC1hLXZhbGlkLXdpcmVndWFyZC1wdWJsaWMta2V5',
    region: { id: 'fra', name: 'Frankfurt' },
  },
  {
    id: 'srv2',
    name: 'edge-02',
    status: 'provisioning', // not toggleable
    public_ip: '198.51.100.2',
    endpoint: 'edge-02.vpn.example.com',
    region: { id: 'fra', name: 'Frankfurt' },
  },
];

describe('VpnServerList (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToggleVpnServerStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: null,
    });
    vi.mocked(useVpnServers).mockReturnValue({
      data: { data: servers, total_count: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <VpnServerList />
      </MemoryRouter>
    );

  it('renders server rows with region links and disables toggles for non-toggleable states', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('link', { name: 'edge-01' })).toHaveAttribute(
      'href',
      '/admin/vpn-servers/srv1'
    );
    expect(screen.getAllByRole('link', { name: /Frankfurt/ })[0]).toHaveAttribute(
      'href',
      '/admin/vpn-regions/fra'
    );
    expect(screen.getByText('198.51.100.1')).toBeInTheDocument();
    expect(screen.getByText('node-1.us-east-1.vpn.example.com')).toBeInTheDocument();

    // The provisioning row cannot be switched.
    expect(screen.getByLabelText('Toggle active status for edge-02')).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'View Config' })[0]);
    expect(await screen.findAllByText(/active peers/i)).toBeTruthy();
    expect(await screen.findByText('10.1.0.1/16')).toBeInTheDocument();
    expect(await screen.findByText('Public Key')).toBeInTheDocument();
  });
});
