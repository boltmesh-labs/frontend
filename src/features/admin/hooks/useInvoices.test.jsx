import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import { useCancelInvoice, useInvoiceDetail, useInvoices } from './useInvoices';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useInvoices resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: { data: [], total_count: 0 } });
    apiClient.api.post.mockResolvedValue({ data: {} });
  });

  it('lists invoices with params and loads a detail by id', async () => {
    const list = renderHook(() => useInvoices({ invoice_status: 'pending' }), { wrapper });
    const detail = renderHook(() => useInvoiceDetail('inv1'), { wrapper });

    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenNthCalledWith(1, '/admin/invoices', {
      params: { invoice_status: 'pending' },
    });
    expect(apiClient.api.get).toHaveBeenNthCalledWith(2, '/admin/invoices/inv1');
  });

  it('cancels an invoice through the cancel action endpoint', async () => {
    const { result } = renderHook(() => useCancelInvoice(), { wrapper });
    await result.current.mutateAsync('inv9');

    await waitFor(() =>
      expect(apiClient.api.post).toHaveBeenCalledWith('/admin/invoices/inv9/cancel')
    );
    expect(toast.success).toHaveBeenCalledWith('Invoice canceled');
  });
});
