import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  useCreateVpnServer,
  useDeleteVpnServer,
  useUpdateVpnServer,
  useVpnServerDetail,
} from '@/features/admin/hooks/useVpnServers';
import { useVpnRegions } from '@/features/admin/hooks/useVpnRegions';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from 'react-toastify';

import VpnServerDetail from './VpnServerDetail';

vi.mock('@/features/admin/hooks/useVpnServers', () => ({
  useVpnServerDetail: vi.fn(),
  useCreateVpnServer: vi.fn(),
  useUpdateVpnServer: vi.fn(),
  useDeleteVpnServer: vi.fn(),
}));
vi.mock('@/features/admin/hooks/useVpnRegions', () => ({ useVpnRegions: vi.fn() }));
vi.mock('@/hooks/useConfirm', () => ({ useConfirm: vi.fn() }));
vi.mock('react-toastify', async () => {
  const actual = await vi.importActual('react-toastify');
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const server = {
  id: 'srv1',
  name: 'Us-East-01',
  region_id: 'r1',
  public_ip: '198.51.100.1',
  endpoint: 'node-1.us-east-1.vpn.example.com',
  tunnel_ip: '10.1.0.1/16',
  wg_port: 51820,
  wg_public_key: 'c3VjaC1hLXZhbGlkLXdpcmVndWFyZC1wdWJsaWMta2V5',
  os: 'ubuntu',
  status: 'online',
};

const renderAt = (id) =>
  render(
    <MemoryRouter initialEntries={[`/admin/vpn-servers/${id}`]}>
      <Routes>
        <Route path="/admin/vpn-servers" element={<div>Server list</div>} />
        <Route path="/admin/vpn-servers/:id" element={<VpnServerDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('VpnServerDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Region dropdown options for both create and edit modes.
    vi.mocked(useVpnRegions).mockReturnValue({
      data: { data: [{ id: 'r1', name: 'Frankfurt' }], total_count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useCreateVpnServer).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    vi.mocked(useUpdateVpnServer).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    vi.mocked(useDeleteVpnServer).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    vi.mocked(useConfirm).mockReturnValue({ confirm: vi.fn(), confirmDialog: null });
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('creates a server and reveals the one-time bootstrap command', async () => {
    const user = userEvent.setup();
    const create = vi
      .fn()
      .mockResolvedValue({ ...server, id: 'srv9', bootstrap_command: 'curl -sSL https://x | sh' });
    vi.mocked(useCreateVpnServer).mockReturnValue({ mutateAsync: create, isPending: false });
    renderAt('new');

    await user.type(screen.getByPlaceholderText('e.g. Us-East-01'), 'Eu-West-02');
    // Region is a required select; pick Frankfurt (option label carries the code).
    await user.selectOptions(
      screen.getAllByRole('combobox')[0],
      screen.getByRole('option', { name: /Frankfurt/ })
    );
    await user.type(screen.getByPlaceholderText(/node-1\.us-east-1/), 'eu-west-02.vpn.example.com');
    await user.type(screen.getByPlaceholderText('e.g. 198.51.100.1'), '198.51.100.99');
    await user.type(screen.getByPlaceholderText('e.g. 10.1.0.1/16'), '10.2.0.1/16');
    await user.click(screen.getByRole('button', { name: /create server/i }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    const payload = create.mock.calls[0][0];
    expect(payload.name).toBe('Eu-West-02');
    expect(payload.region_id).toBe('r1');
    expect(payload.public_ip).toBe('198.51.100.99');
    expect(payload.endpoint).toBe('eu-west-02.vpn.example.com');
    expect(payload.tunnel_ip).toBe('10.2.0.1/16');

    expect(await screen.findByText('Bootstrap Command')).toBeInTheDocument();
    expect(screen.getByText('curl -sSL https://x | sh')).toBeInTheDocument();
  });

  it('creates a server without an endpoint and omits it from the payload', async () => {
    const user = userEvent.setup();
    const create = vi
      .fn()
      .mockResolvedValue({ ...server, id: 'srv9', bootstrap_command: 'curl -sSL https://x | sh' });
    vi.mocked(useCreateVpnServer).mockReturnValue({ mutateAsync: create, isPending: false });
    renderAt('new');

    await user.type(screen.getByPlaceholderText('e.g. Us-East-01'), 'Eu-West-02');
    await user.selectOptions(
      screen.getAllByRole('combobox')[0],
      screen.getByRole('option', { name: /Frankfurt/ })
    );
    await user.type(screen.getByPlaceholderText('e.g. 198.51.100.1'), '198.51.100.99');
    await user.type(screen.getByPlaceholderText('e.g. 10.1.0.1/16'), '10.2.0.1/16');
    // Endpoint left empty — optional, clients dial the public IP instead.
    await user.click(screen.getByRole('button', { name: /create server/i }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    const payload = create.mock.calls[0][0];
    expect(payload).not.toHaveProperty('endpoint');
    expect(payload.public_ip).toBe('198.51.100.99');

    expect(await screen.findByText('Bootstrap Command')).toBeInTheDocument();
  });

  it('edits a manual provisioning server including topology fields and refreshes after saving', async () => {
    const provisioningServer = { ...server, status: 'provisioning', is_manual: true };
    const update = vi.fn().mockResolvedValue({ ...provisioningServer, name: 'Us-East-01b' });
    const refetch = vi.fn();
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: provisioningServer,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    vi.mocked(useUpdateVpnServer).mockReturnValue({ mutateAsync: update, isPending: false });
    const user = userEvent.setup();
    renderAt('srv1');

    await user.click(screen.getByRole('button', { name: /edit server/i }));
    const nameInput = screen.getByPlaceholderText('e.g. Us-East-01');
    expect(nameInput).toBeEnabled();
    await user.clear(nameInput);
    await user.type(nameInput, 'Us-East-02');
    // Manual servers keep topology editable (was provisioning-only before).
    expect(screen.getByPlaceholderText('e.g. 10.1.0.1/16')).toBeEnabled();
    expect(
      screen.getByText('Manual topology. Server/service restart required to apply changes.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'srv1',
          name: 'Us-East-02',
          endpoint: 'node-1.us-east-1.vpn.example.com',
          tunnel_ip: '10.1.0.1/16',
          wg_port: 51820,
        })
      )
    );
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('locks topology fields on AMI auto-provisioned servers and sends a status-only payload', async () => {
    const amiServer = { ...server, status: 'online', is_manual: false };
    const update = vi.fn().mockResolvedValue({ ...amiServer, status: 'maintenance' });
    const refetch = vi.fn();
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: amiServer, // AMI auto-provisioned — node-authoritative topology
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    vi.mocked(useUpdateVpnServer).mockReturnValue({ mutateAsync: update, isPending: false });
    const user = userEvent.setup();
    renderAt('srv1');

    await user.click(screen.getByRole('button', { name: /edit server/i }));
    // All topology fields are disabled; only status stays editable.
    expect(screen.getByPlaceholderText('e.g. Us-East-01')).toBeDisabled();
    expect(screen.getByPlaceholderText('e.g. 198.51.100.1')).toBeDisabled();
    expect(screen.getByPlaceholderText(/node-1\.us-east-1/)).toBeDisabled();
    expect(screen.getByPlaceholderText('e.g. 10.1.0.1/16')).toBeDisabled();
    expect(screen.getByPlaceholderText('51820')).toBeDisabled();
    expect(screen.getByText(/Auto-provisioned \(AMI\)/)).toBeInTheDocument();

    await user.selectOptions(screen.getAllByRole('combobox')[1], 'maintenance');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const payload = update.mock.calls[0][0];
    expect(payload).toEqual({ id: 'srv1', status: 'maintenance' });
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('keeps topology editable on manual servers even after the node is online', async () => {
    const manualServer = { ...server, status: 'online', is_manual: true };
    const update = vi.fn().mockResolvedValue({ ...manualServer, name: 'Us-East-01b' });
    const refetch = vi.fn();
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: manualServer,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    vi.mocked(useUpdateVpnServer).mockReturnValue({ mutateAsync: update, isPending: false });
    const user = userEvent.setup();
    renderAt('srv1');

    await user.click(screen.getByRole('button', { name: /edit server/i }));
    const nameInput = screen.getByPlaceholderText('e.g. Us-East-01');
    expect(nameInput).toBeEnabled();
    expect(screen.getByPlaceholderText('e.g. 10.1.0.1/16')).toBeEnabled();
    await user.clear(nameInput);
    await user.type(nameInput, 'Us-East-02');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'srv1',
          name: 'Us-East-02',
          endpoint: 'node-1.us-east-1.vpn.example.com',
          tunnel_ip: '10.1.0.1/16',
          wg_port: 51820,
        })
      )
    );
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('blocks submission with a clear message instead of sending an empty region_id', async () => {
    const create = vi.fn();
    vi.mocked(useCreateVpnServer).mockReturnValue({ mutateAsync: create, isPending: false });
    renderAt('new');

    // Submits programmatically, bypassing the browser's native `required`
    // check — mirroring the real paths where it cannot run (e.g. the region
    // select was still disabled while regions were loading).
    fireEvent.submit(document.getElementById('vpn-server-form'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Region is required.'));
    expect(create).not.toHaveBeenCalled();
  });

  it('blocks submission with a clear message instead of sending an empty public_ip', async () => {
    const user = userEvent.setup();
    const create = vi.fn();
    vi.mocked(useCreateVpnServer).mockReturnValue({ mutateAsync: create, isPending: false });
    renderAt('new');

    await user.type(screen.getByPlaceholderText('e.g. Us-East-01'), 'Eu-West-02');
    await user.selectOptions(
      screen.getAllByRole('combobox')[0],
      screen.getByRole('option', { name: /Frankfurt/ })
    );
    await user.type(screen.getByPlaceholderText(/node-1\.us-east-1/), 'eu-west-02.vpn.example.com');
    await user.type(screen.getByPlaceholderText('e.g. 10.1.0.1/16'), '10.2.0.1/16');
    // Submit programmatically to bypass the browser's native `required`
    // check on the empty public_ip input (same as the region test above).
    fireEvent.submit(document.getElementById('vpn-server-form'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Public IP is required.'));
    expect(create).not.toHaveBeenCalled();
  });

  it('sends null endpoint when clearing it on a manual server edit', async () => {
    const manualServer = { ...server, status: 'online', is_manual: true };
    const update = vi.fn().mockResolvedValue({ ...manualServer, endpoint: null });
    const refetch = vi.fn();
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: manualServer,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    vi.mocked(useUpdateVpnServer).mockReturnValue({ mutateAsync: update, isPending: false });
    const user = userEvent.setup();
    renderAt('srv1');

    await user.click(screen.getByRole('button', { name: /edit server/i }));
    await user.clear(screen.getByPlaceholderText(/node-1\.us-east-1/));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0].endpoint).toBeNull();
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('shows the delete button only for decommissioned servers', async () => {
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: server, // status: 'online'
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderAt('srv1');

    expect(screen.queryByRole('button', { name: /delete server/i })).not.toBeInTheDocument();
    expect(screen.getByText('Only decommissioned servers can be deleted.')).toBeInTheDocument();
  });

  it('deletes a decommissioned server after confirmation', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.fn().mockResolvedValue(true);
    vi.mocked(useDeleteVpnServer).mockReturnValue({ mutateAsync: del, isPending: false });
    vi.mocked(useConfirm).mockReturnValue({ confirm, confirmDialog: null });
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: { ...server, status: 'decommissioned' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderAt('srv1');

    await user.click(screen.getByRole('button', { name: /delete server/i }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete VPN Server', confirmText: 'Delete Server' })
    );
    await waitFor(() => expect(del).toHaveBeenCalledWith('srv1'));
  });

  it('does not delete when the confirmation is dismissed', async () => {
    const del = vi.fn();
    vi.mocked(useDeleteVpnServer).mockReturnValue({ mutateAsync: del, isPending: false });
    vi.mocked(useConfirm).mockReturnValue({
      confirm: vi.fn().mockResolvedValue(false),
      confirmDialog: null,
    });
    vi.mocked(useVpnServerDetail).mockReturnValue({
      data: { ...server, status: 'decommissioned' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderAt('srv1');

    await user.click(screen.getByRole('button', { name: /delete server/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /delete server/i })).toBeInTheDocument()
    );
    expect(del).not.toHaveBeenCalled();
  });
});
