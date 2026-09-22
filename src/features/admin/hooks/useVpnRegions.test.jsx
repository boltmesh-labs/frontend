import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import {
  useCreateVpnRegion,
  useToggleVpnRegionStatus,
  useUpdateVpnRegion,
  useVpnRegionDetail,
} from './useVpnRegions';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useVpnRegions resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: {} });
    apiClient.api.post.mockResolvedValue({ data: {} });
    apiClient.api.patch.mockResolvedValue({ data: {} });
  });

  it('guards region details against sentinel ids', () => {
    const sentinel = renderHook(() => useVpnRegionDetail('new'), { wrapper });
    expect(sentinel.result.current.isEnabled).toBe(false);
  });

  it('toggles regions through PATCH with an is_active body', async () => {
    const { result } = renderHook(() => useToggleVpnRegionStatus(), { wrapper });
    await result.current.mutateAsync({ id: 'r1', isActive: true });

    await waitFor(() =>
      expect(apiClient.api.patch).toHaveBeenCalledWith('/admin/vpn-regions/r1', {
        is_active: false,
      })
    );
    expect(toast.success).toHaveBeenCalledWith('VPN Region status updated');
  });

  it.each([
    ['create', useCreateVpnRegion, () => apiClient.api.post],
    ['update', useUpdateVpnRegion, () => apiClient.api.patch],
  ])('%s mutations toast success', async (_label, factory) => {
    const { result } = renderHook(() => factory(), { wrapper });
    if (factory === useCreateVpnRegion) await result.current.mutateAsync({ name: 'EU' });
    else await result.current.mutateAsync({ id: 'r1', name: 'EU' });

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
