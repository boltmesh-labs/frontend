import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import {
  useToggleUserStatus,
  useUpdateUser,
  useUserDetail,
  useUserDevices,
  useUserInvoices,
  useUsers,
  useUserSubscriptions,
} from './useUsers';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useUsers resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: { data: [], total_count: 0 } });
    apiClient.api.patch.mockResolvedValue({ data: {} });
  });

  it('fetches the paginated user list with params', async () => {
    const { result } = renderHook(() => useUsers({ search: 'amy' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/users', { params: { search: 'amy' } });
  });

  it('guards the profile detail query against the new sentinel id', async () => {
    const sentinel = renderHook(() => useUserDetail('new'), { wrapper });
    expect(sentinel.result.current.isEnabled).toBe(false);

    const real = renderHook(() => useUserDetail('u1'), { wrapper });
    expect(real.result.current.isEnabled).toBe(true);
    await waitFor(() => expect(real.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/users/u1/profile');
  });

  it('fetches the related resources for a user', async () => {
    const devices = renderHook(() => useUserDevices('u1'), { wrapper });
    const subscriptions = renderHook(() => useUserSubscriptions('u1'), { wrapper });
    const invoices = renderHook(() => useUserInvoices('u1'), { wrapper });

    await waitFor(() => expect(devices.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(subscriptions.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invoices.result.current.isSuccess).toBe(true));

    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/vpn-devices/by-user/u1');
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/subscriptions/by-user/u1');
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/invoices/by-user/u1');
  });

  it('disables related user queries without a user id', () => {
    const devices = renderHook(() => useUserDevices(), { wrapper });
    const subscriptions = renderHook(() => useUserSubscriptions(), { wrapper });
    const invoices = renderHook(() => useUserInvoices(), { wrapper });

    expect(devices.result.current.isEnabled).toBe(false);
    expect(subscriptions.result.current.isEnabled).toBe(false);
    expect(invoices.result.current.isEnabled).toBe(false);
    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('toggles status via the dedicated status endpoint', async () => {
    const { result } = renderHook(() => useToggleUserStatus(), { wrapper });
    await result.current.mutateAsync({ id: 'u1', isActive: true });

    await waitFor(() => expect(apiClient.api.patch).toHaveBeenCalledWith('/admin/users/u1/status'));
    expect(toast.success).toHaveBeenCalledWith('User status updated');
  });

  it('updates users through the bare resource PATCH', async () => {
    const { result } = renderHook(() => useUpdateUser(), { wrapper });
    await result.current.mutateAsync({ id: 'u2', role: 'admin' });

    expect(apiClient.api.patch).toHaveBeenCalledWith('/admin/users/u2', { role: 'admin' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('User updated'));
  });
});
