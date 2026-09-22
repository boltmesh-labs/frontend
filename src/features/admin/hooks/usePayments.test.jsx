import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { usePaymentDetail, usePayments } from './usePayments';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn() } },
}));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('usePayments resource hooks (read-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: { data: [], total_count: 0 } });
  });

  it('exposes the payments ledger list and detail without mutations', async () => {
    const list = renderHook(() => usePayments({ payment_status: 'succeeded' }), { wrapper });
    const detail = renderHook(() => usePaymentDetail('pay1'), { wrapper });

    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenNthCalledWith(1, '/admin/payments', {
      params: { payment_status: 'succeeded' },
    });
    expect(apiClient.api.get).toHaveBeenNthCalledWith(2, '/admin/payments/pay1');
    // Payments stay read-only for admins.
    expect(apiClient.api.post).toBeUndefined();
  });
});
