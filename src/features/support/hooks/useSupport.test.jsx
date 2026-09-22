import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { useSendContactMessage } from './useSupport';

vi.mock('@/api/client', () => ({
  apiClient: { api: { post: vi.fn() } },
}));

describe('useSendContactMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.post.mockResolvedValue({ data: { ok: true } });
  });

  it('posts to /support/contact with a defaulted subject and abort signal', async () => {
    const controller = new AbortController();
    const { result } = renderHook(() => useSendContactMessage(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
      ),
    });

    await result.current.mutateAsync({
      formData: { name: 'Ann', email: 'a@b.co', subject: '   ', message: 'hi' },
      signal: controller.signal,
    });

    await waitFor(() => expect(apiClient.api.post).toHaveBeenCalled());
    expect(apiClient.api.post).toHaveBeenCalledWith(
      '/support/contact',
      { name: 'Ann', email: 'a@b.co', subject: 'General Support Inquiry', message: 'hi' },
      { signal: controller.signal }
    );
  });
});
