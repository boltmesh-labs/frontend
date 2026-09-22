import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './AuthContext';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { post: vi.fn() },
    authApi: { post: vi.fn() },
    setToken: vi.fn(),
    clearAuth: vi.fn(),
    onTokenRefreshed: vi.fn(() => vi.fn()),
  },
}));

const b64url = (value) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeToken = (payload) => `${b64url({ alg: 'none' })}.${b64url(payload)}.sig`;

const renderWithProvider = () => {
  let captured;
  const Probe = () => {
    captured = useAuth();
    return <div />;
  };
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
  return { view, getContext: () => captured };
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // onTokenRefreshed must keep returning an unsubscribe fn after clearing.
    apiClient.onTokenRefreshed.mockImplementation(() => vi.fn());
  });

  it('boots via silent refresh and parses the JWT identity', async () => {
    apiClient.authApi.post.mockResolvedValue({
      data: { access_token: makeToken({ sub: 'u1', role: 'admin' }) },
    });

    const { getContext } = renderWithProvider();

    await waitFor(() => expect(getContext().loading).toBe(false));
    expect(apiClient.authApi.post).toHaveBeenCalledWith('/auth/refresh-token');
    expect(getContext().accessToken).toBeTypeOf('string');
    expect(getContext().user).toEqual({ id: 'u1', role: 'admin' });
    expect(apiClient.setToken).toHaveBeenCalled();
  });

  it('clears auth when the silent refresh fails', async () => {
    apiClient.authApi.post.mockRejectedValue(new Error('offline'));

    const { getContext } = renderWithProvider();

    await waitFor(() => expect(getContext().loading).toBe(false));
    expect(apiClient.clearAuth).toHaveBeenCalled();
    expect(getContext().accessToken).toBeNull();
    expect(getContext().user).toBeNull();
  });

  it('keeps the session tokenless when the JWT cannot be parsed', async () => {
    apiClient.authApi.post.mockResolvedValue({ data: { access_token: '.%%%.sig' } });

    const { getContext } = renderWithProvider();

    await waitFor(() => expect(getContext().loading).toBe(false));
    expect(getContext().accessToken).toBeTypeOf('string');
    expect(getContext().user).toBeNull();
  });

  it('logs out through the API and clears local state even when it fails', async () => {
    apiClient.authApi.post.mockResolvedValueOnce({ data: {} });
    apiClient.api.post.mockRejectedValueOnce(new Error('network down'));

    const { getContext } = renderWithProvider();
    await waitFor(() => expect(getContext().loading).toBe(false));

    await act(async () => {
      await getContext().logout();
    });

    expect(apiClient.api.post).toHaveBeenCalledWith('/auth/logout');
    expect(apiClient.clearAuth).toHaveBeenCalled();
    expect(getContext().accessToken).toBeNull();
  });

  it('updateUser merges profile changes into the current identity', async () => {
    apiClient.authApi.post.mockResolvedValue({
      data: { access_token: makeToken({ sub: 'u1', role: 'user' }) },
    });

    const { getContext } = renderWithProvider();
    await waitFor(() => expect(getContext().loading).toBe(false));

    act(() => getContext().updateUser({ id: 'u1', role: 'admin' }));

    expect(getContext().user).toEqual({ id: 'u1', role: 'admin' });
    // No previous user: merge must be a no-op rather than fabricate one.
    act(() => getContext().setAccessToken(null));
    act(() => getContext().updateUser({ id: 'x', role: 'admin' }));
    expect(getContext().user).toBeNull();
  });

  it('adopts tokens pushed by ApiClient-driven refreshes', async () => {
    let listener;
    apiClient.onTokenRefreshed.mockImplementationOnce((fn) => {
      listener = fn;
      return vi.fn();
    });
    apiClient.authApi.post.mockRejectedValue(new Error('no session'));

    const { view, getContext } = renderWithProvider();
    await waitFor(() => expect(getContext().loading).toBe(false));

    act(() => listener(makeToken({ sub: 'u9', role: 'user' })));
    view.rerender(
      <AuthProvider>
        <div />
      </AuthProvider>
    );
    await waitFor(() => expect(getContext().user).toEqual({ id: 'u9', role: 'user' }));
  });
});
