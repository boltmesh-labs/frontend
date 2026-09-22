import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  useCreateVpnRegion,
  useDeleteVpnRegion,
  useUpdateVpnRegion,
  useVpnRegionDetail,
} from '@/features/admin/hooks/useVpnRegions';
import { useConfirm } from '@/hooks/useConfirm';
import VpnRegionDetail from './VpnRegionDetail';

vi.mock('@/features/admin/hooks/useVpnRegions', () => ({
  useVpnRegionDetail: vi.fn(),
  useCreateVpnRegion: vi.fn(),
  useUpdateVpnRegion: vi.fn(),
  useDeleteVpnRegion: vi.fn(),
}));
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: vi.fn(),
}));
vi.mock('react-toastify', async () => {
  const actual = await vi.importActual('react-toastify');
  return { ...actual, toast: { ...actual.toast, success: vi.fn() } };
});

const region = {
  id: 'r1',
  name: 'Frankfurt',
  country_code: 'de',
  is_active: true,
};

const renderAt = (id) =>
  render(
    <MemoryRouter initialEntries={[`/admin/vpn-regions/${id}`]}>
      <Routes>
        <Route path="/admin/vpn-regions/:id" element={<VpnRegionDetail />} />
        <Route path="/admin" element={<div>Back home</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('VpnRegionDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateVpnRegion).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    vi.mocked(useUpdateVpnRegion).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    vi.mocked(useDeleteVpnRegion).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    vi.mocked(useConfirm).mockReturnValue({ confirm: vi.fn(), confirmDialog: null });
    vi.mocked(useVpnRegionDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('opens the create form in editable mode for the new sentinel id and submits it', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue({ ...region, id: 'r9' });
    vi.mocked(useCreateVpnRegion).mockReturnValue({ mutateAsync: create, isPending: false });
    renderAt('new');

    expect(screen.getByText('Create Region')).toBeInTheDocument(); // header action
    // Every field is required, so fill them all before submitting.
    await user.type(screen.getByPlaceholderText('e.g. us-east-1'), 'FRA-02');
    await user.type(screen.getByPlaceholderText('e.g. US East'), 'Frankfurt 2');
    await user.type(screen.getByPlaceholderText('e.g. US'), 'DE');
    await user.click(screen.getByRole('button', { name: /create region/i }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fra-02', name: 'Frankfurt 2' })
      )
    );
  });

  it('shows the read-only view for an existing region and enters edit mode on demand', async () => {
    const update = vi.fn().mockResolvedValue(region);
    const refetch = vi.fn();
    vi.mocked(useVpnRegionDetail).mockReturnValue({
      data: region,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    vi.mocked(useUpdateVpnRegion).mockReturnValue({ mutateAsync: update, isPending: false });
    const user = userEvent.setup();
    renderAt('r1');

    // Read-only: inputs disabled, timestamps visible.
    expect(screen.getByPlaceholderText('e.g. us-east-1')).toBeDisabled();
    expect(screen.getAllByText(/last updated:/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /edit region/i }));
    const nameInput = screen.getByPlaceholderText('e.g. US East');
    expect(nameInput).toBeEnabled();
    await user.clear(nameInput);
    await user.type(nameInput, 'Frankfurt Prime');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1', name: 'Frankfurt Prime' })
      )
    );
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('deletes the region after confirmation', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.fn().mockResolvedValue(true);
    vi.mocked(useDeleteVpnRegion).mockReturnValue({ mutateAsync: del, isPending: false });
    vi.mocked(useConfirm).mockReturnValue({ confirm, confirmDialog: null });
    vi.mocked(useVpnRegionDetail).mockReturnValue({
      data: region,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderAt('r1');

    await user.click(screen.getByRole('button', { name: /delete region/i }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete VPN Region', confirmText: 'Delete Region' })
    );
    await waitFor(() => expect(del).toHaveBeenCalledWith('r1'));
  });

  it('does not delete when the confirmation is dismissed', async () => {
    const del = vi.fn();
    vi.mocked(useDeleteVpnRegion).mockReturnValue({ mutateAsync: del, isPending: false });
    vi.mocked(useConfirm).mockReturnValue({
      confirm: vi.fn().mockResolvedValue(false),
      confirmDialog: null,
    });
    vi.mocked(useVpnRegionDetail).mockReturnValue({
      data: region,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderAt('r1');

    await user.click(screen.getByRole('button', { name: /delete region/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /delete region/i })).toBeInTheDocument()
    );
    expect(del).not.toHaveBeenCalled();
  });
});
