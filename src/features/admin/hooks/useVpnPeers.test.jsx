import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { useVpnPeerDetail } from './useVpnPeers';

vi.mock('@/api/client', () => ({
  apiClient: { api: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() } },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useVpnPeers resource hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: {} });
    apiClient.api.patch.mockResolvedValue({ data: {} });
    apiClient.api.delete.mockResolvedValue({});
  });

  it('guards peer details against sentinel ids', () => {
    const sentinel = renderHook(() => useVpnPeerDetail('new'), { wrapper });
    expect(sentinel.result.current.isEnabled).toBe(false);
  });
});
