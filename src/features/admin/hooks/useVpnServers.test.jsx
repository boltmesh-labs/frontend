import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import {
  useCreateVpnServer,
  useToggleVpnServerStatus,
  useUpdateVpnServer,
  useVpnServerDetail,
} from './useVpnServers';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useVpnServers resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: {} });
    apiClient.api.post.mockResolvedValue({ data: {} });
    apiClient.api.patch.mockResolvedValue({ data: {} });
  });

  it('keeps the detail query disabled without an id or the /new sentinel', () => {
    const missing = renderHook(() => useVpnServerDetail(undefined), { wrapper });
    expect(missing.result.current.isEnabled).toBe(false);

    // /admin/vpn-servers/new is the client-side create route; fetching it
    // would reach the UUID-typed detail endpoint and fail path validation.
    const sentinel = renderHook(() => useVpnServerDetail('new'), { wrapper });
    expect(sentinel.result.current.isEnabled).toBe(false);
    expect(apiClient.api.get).not.toHaveBeenCalled();

    const real = renderHook(() => useVpnServerDetail('srv1'), { wrapper });
    expect(real.result.current.isEnabled).toBe(true);
  });

  it('toggles servers through PATCH with a status body and refreshes everything', async () => {
    const { result } = renderHook(() => useToggleVpnServerStatus(), { wrapper });
    await result.current.mutateAsync({ id: 'srv1', status: 'maintenance' });

    await waitFor(() =>
      expect(apiClient.api.patch).toHaveBeenCalledWith('/admin/vpn-servers/srv1', {
        status: 'maintenance',
      })
    );
    // The message is derived from the requested target state.
    expect(toast.success).toHaveBeenCalledWith('Server status updated to maintenance.');
  });

  it.each([useCreateVpnServer, useUpdateVpnServer])(
    '%s posts/patches successfully',
    async (factory) => {
      const { result } = renderHook(() => factory(), { wrapper });
      if (factory === useCreateVpnServer) await result.current.mutateAsync({ name: 'edge-1' });
      else await result.current.mutateAsync({ id: 'srv1', name: 'edge-1b' });

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
    }
  );
});
