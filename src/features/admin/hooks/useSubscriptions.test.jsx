import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import {
  useCancelSubscription,
  useSubscriptionDetail,
  useSubscriptionDevices,
  useSubscriptionInvoices,
  useSubscriptions,
} from './useSubscriptions';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useSubscriptions resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: { data: [], total_count: 0 } });
    apiClient.api.post.mockResolvedValue({ data: {} });
  });

  it('lists subscriptions with params and fetches details', async () => {
    const list = renderHook(() => useSubscriptions({ subscription_status: 'active' }), { wrapper });
    const detail = renderHook(() => useSubscriptionDetail('s1'), { wrapper });

    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenNthCalledWith(1, '/admin/subscriptions', {
      params: { subscription_status: 'active' },
    });
    expect(apiClient.api.get).toHaveBeenNthCalledWith(2, '/admin/subscriptions/s1');
  });

  it('fetches devices and invoices for a subscription', async () => {
    const devices = renderHook(() => useSubscriptionDevices('s1'), { wrapper });
    const invoices = renderHook(() => useSubscriptionInvoices('s1'), { wrapper });

    await waitFor(() => expect(devices.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invoices.result.current.isSuccess).toBe(true));

    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/vpn-devices/by-subscription/s1');
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/invoices/by-subscription/s1');
  });

  it('disables related subscription queries without a subscription id', () => {
    const devices = renderHook(() => useSubscriptionDevices(), { wrapper });
    const invoices = renderHook(() => useSubscriptionInvoices(), { wrapper });

    expect(devices.result.current.isEnabled).toBe(false);
    expect(invoices.result.current.isEnabled).toBe(false);
    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('cancels a subscription and toasts the outcome', async () => {
    const { result } = renderHook(() => useCancelSubscription(), { wrapper });
    await result.current.mutateAsync('s2');

    await waitFor(() =>
      expect(apiClient.api.post).toHaveBeenCalledWith('/admin/subscriptions/s2/cancel')
    );
    expect(toast.success).toHaveBeenCalledWith('Subscription cancelled');
  });
});
