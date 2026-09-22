import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';

import {
  createAdminResource,
  makeUseActionMutation,
  makeUseStatusToggle,
} from './createAdminResource';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const listKey = (params) => ['test', 'things', ...(params !== undefined ? [params] : [])];
const detailKey = (id) => ['test', 'things', 'detail', id];

const makeResource = (overrides = {}) =>
  createAdminResource({
    resourcePath: '/admin/things',
    listKey,
    detailKey,
    ...overrides,
  });

describe('createAdminResource', () => {
  let queryClient;
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  it('fetches the collection with params and passes responses through by default', async () => {
    apiClient.api.get.mockResolvedValue({ data: [{ id: 'a' }] });
    const { useList } = makeResource();

    const { result } = renderHook(() => useList({ search: 'x' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/things', {
      params: { search: 'x' },
    });
    expect(result.current.data).toEqual([{ id: 'a' }]);
  });

  it('applies listOptions.transform when provided', async () => {
    apiClient.api.get.mockResolvedValue({ data: { items: [1, 2] } });
    const { useList } = makeResource({ listOptions: { transform: (d) => d.items } });

    const { result } = renderHook(() => useList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([1, 2]);
  });

  it('guards the detail query against sentinel and missing ids', async () => {
    const { useDetail } = makeResource({ detailOptions: { requireRealId: true } });

    const sentinel = renderHook(() => useDetail('new'), { wrapper });
    expect(sentinel.result.current.isEnabled).toBe(false);
    const missing = renderHook(() => useDetail(undefined), { wrapper });
    expect(missing.result.current.isEnabled).toBe(false);

    const real = renderHook(() => useDetail('7'), { wrapper });
    expect(real.result.current.isEnabled).toBe(true);
    await waitFor(() => expect(real.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/things/7');
  });

  it('supports a detail path suffix and the plain enabled guard', async () => {
    apiClient.api.get.mockResolvedValue({ data: { id: '3' } });
    const { useDetail } = makeResource({ detailOptions: { pathSuffix: '/profile' } });

    const { result } = renderHook(() => useDetail('3'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/admin/things/3/profile');
  });

  it('create posts the payload, toasts, and invalidates the list scope', async () => {
    apiClient.api.post.mockResolvedValue({ data: { id: 'new-1' } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { makeUseCreate } = makeResource();

    const { result } = renderHook(() => makeUseCreate({ successMessage: 'Created!' })(), {
      wrapper,
    });
    const returned = await result.current.mutateAsync({ name: 'x' });

    expect(returned).toEqual({ id: 'new-1' });
    expect(toast.success).toHaveBeenCalledWith('Created!');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: listKey() });
  });

  it('delete removes the cached detail only when removeDetail is set', async () => {
    apiClient.api.delete.mockResolvedValue({});
    const removeSpy = vi.spyOn(queryClient, 'removeQueries');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { makeUseDelete } = makeResource();

    const { result: withRemove } = renderHook(
      () => makeUseDelete({ successMessage: 'Gone', removeDetail: true })(),
      { wrapper }
    );
    await withRemove.current.mutateAsync('9');

    expect(removeSpy).toHaveBeenCalledWith({ queryKey: detailKey('9') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: listKey() });

    const { result: withoutRemove } = renderHook(
      () => makeUseDelete({ successMessage: 'Gone' })(),
      { wrapper }
    );
    await withoutRemove.current.mutateAsync('9');
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('makeUseStatusToggle', () => {
  let queryClient;
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  const renderToggle = (config) => renderHook(() => makeUseStatusToggle(config)(), { wrapper });

  it('flips is_active optimistically across array-shaped caches', async () => {
    queryClient.setQueryData(listKey(), [
      { id: 'a', is_active: false },
      { id: 'b', is_active: true },
    ]);
    apiClient.api.patch.mockResolvedValue({});

    const { result } = renderToggle({
      scopeKey: () => listKey(),
      field: 'is_active',
      request: ({ id }) => apiClient.api.patch(`/status/${id}`),
      successMessage: 'Toggled',
      errorFallback: 'Nope',
    });
    await result.current.mutateAsync({ id: 'a', isActive: false });

    expect(queryClient.getQueryData(listKey())).toEqual([
      { id: 'a', is_active: true },
      { id: 'b', is_active: true },
    ]);
    expect(toast.success).toHaveBeenCalledWith('Toggled');
  });

  it('also flips paginated-envelope and bare-detail caches when configured', async () => {
    queryClient.setQueryData(listKey(), { data: [{ id: 'a', enabled: true }] });
    queryClient.setQueryData(detailKey('a'), { id: 'a', enabled: true });
    apiClient.api.patch.mockResolvedValue({});

    const { result } = renderToggle({
      scopeKey: () => listKey(),
      field: 'enabled',
      getNext: ({ enabled }) => !enabled,
      request: ({ id }) => apiClient.api.patch(`/toggle/${id}`),
      successMessage: ({ result: r }) => `now ${r.enabled}`,
      errorFallback: 'Nope',
      includeDetailObject: true,
    });
    await result.current.mutateAsync({ id: 'a', enabled: true });

    expect(queryClient.getQueryData(listKey()).data[0].enabled).toBe(false);
    expect(queryClient.getQueryData(detailKey('a')).enabled).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('now false');
  });

  it('rolls back every cached query and toasts an error when the request fails', async () => {
    const original = [{ id: 'a', is_active: false }];
    queryClient.setQueryData(
      listKey(),
      original.map((i) => ({ ...i }))
    );
    apiClient.api.patch.mockRejectedValue(new Error('boom'));

    const { result } = renderToggle({
      scopeKey: () => listKey(),
      field: 'is_active',
      request: ({ id }) => apiClient.api.patch(`/status/${id}`),
      successMessage: 'Toggled',
      errorFallback: 'Toggle failed',
    });
    await expect(result.current.mutateAsync({ id: 'a', isActive: false })).rejects.toThrow('boom');

    expect(queryClient.getQueryData(listKey())).toEqual(original);
    expect(toast.error).toHaveBeenCalledWith('Toggle failed');
  });

  it('invalidates custom settle scopes (e.g. list + detail)', async () => {
    queryClient.setQueryData(listKey(), []);
    apiClient.api.patch.mockResolvedValue({});
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderToggle({
      scopeKey: () => listKey(),
      field: 'enabled',
      getNext: ({ enabled }) => !enabled,
      request: ({ id }) => apiClient.api.patch(`/toggle/${id}`),
      successMessage: 'ok',
      errorFallback: 'Nope',
      settleKeys: ({ id }) => [listKey(), detailKey(id)],
    });
    await result.current.mutateAsync({ id: 'q', enabled: true });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: listKey() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: detailKey('q') });
  });
});

describe('makeUseActionMutation', () => {
  it('runs the action, toasts, and invalidates the requested scopes', async () => {
    vi.clearAllMocks();
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const request = vi.fn().mockResolvedValue({});

    const useCancel = makeUseActionMutation({
      request,
      successMessage: 'Canceled',
      errorFallback: 'Cancel failed',
      invalidateKeys: (id) => [['detail', id], ['list']],
    });
    const { result } = renderHook(() => useCancel(), { wrapper });
    await result.current.mutateAsync('42');

    expect(request).toHaveBeenCalledWith('42');
    expect(toast.success).toHaveBeenCalledWith('Canceled');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['detail', '42'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['list'] });
  });
});
