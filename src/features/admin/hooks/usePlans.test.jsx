import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import {
  useCreatePlan,
  useDeletePlan,
  usePlanDetail,
  usePlans,
  useTogglePlanStatus,
  useUpdatePlan,
} from './usePlans';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const makeHarness = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
};

describe('usePlans resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.post.mockResolvedValue({ data: {} });
    apiClient.api.patch.mockResolvedValue({ data: {} });
    apiClient.api.delete.mockResolvedValue({});
  });

  it('normalizes the plans envelope to a bare array', async () => {
    apiClient.api.get.mockResolvedValue({ data: { data: [{ id: 'p1' }] } });
    const { wrapper } = makeHarness();

    const hook = renderHook(() => usePlans(), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toEqual([{ id: 'p1' }]);
  });

  it('skips the detail fetch for the new-plan sentinel', () => {
    const { wrapper } = makeHarness();
    const sentinel = renderHook(() => usePlanDetail('new'), { wrapper });
    expect(sentinel.result.current.isEnabled).toBe(false);
  });

  it.each([
    ['create', useCreatePlan],
    ['update', useUpdatePlan],
    ['delete', useDeletePlan],
  ])('runs plan %s mutations with success feedback', async (_label, factory) => {
    const { wrapper } = makeHarness();
    const { result } = renderHook(() => factory(), { wrapper });

    if (factory === useCreatePlan) await result.current.mutateAsync({ name: 'Pro' });
    else if (factory === useUpdatePlan) await result.current.mutateAsync({ id: 'p1', name: 'Pro' });
    else await result.current.mutateAsync('p1');

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('toggles enablement optimistically and settles list + detail scopes', async () => {
    const { queryClient, wrapper } = makeHarness();
    queryClient.setQueryData(['admin', 'plans'], { data: [{ id: 'p1', enabled: true }] });
    queryClient.setQueryData(['admin', 'plans', 'detail', 'p1'], { id: 'p1', enabled: true });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useTogglePlanStatus(), { wrapper });
    await result.current.mutateAsync({ id: 'p1', enabled: true });

    expect(apiClient.api.patch).toHaveBeenCalledWith('/admin/plans/p1/toggle');
    expect(queryClient.getQueryData(['admin', 'plans']).data[0].enabled).toBe(false);
    expect(queryClient.getQueryData(['admin', 'plans', 'detail', 'p1']).enabled).toBe(false);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan successfully disabled.'));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'plans'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'plans', 'detail', 'p1'] });
  });
});
