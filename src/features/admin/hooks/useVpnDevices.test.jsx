import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import { useToggleVpnDeviceStatus, useVpnDeviceDetail, useVpnDevices } from './useVpnDevices';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), patch: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useVpnDevices resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: { data: [], total_count: 0 } });
    apiClient.api.patch.mockResolvedValue({ data: {} });
  });

  it('lists devices and skips detail fetches for sentinel ids', async () => {
    const list = renderHook(() => useVpnDevices({ is_active: true }), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/vpn-devices', {
      params: { is_active: true },
    });

    const sentinel = renderHook(() => useVpnDeviceDetail('new'), { wrapper });
    expect(sentinel.result.current.isEnabled).toBe(false);
  });

  it('toggles device status through the status endpoint', async () => {
    const { result } = renderHook(() => useToggleVpnDeviceStatus(), { wrapper });
    await result.current.mutateAsync({ id: 'd1', isActive: true });

    await waitFor(() =>
      expect(apiClient.api.patch).toHaveBeenCalledWith('/admin/vpn-devices/d1/status')
    );
    expect(toast.success).toHaveBeenCalledWith('VPN Device status updated');
  });
});
