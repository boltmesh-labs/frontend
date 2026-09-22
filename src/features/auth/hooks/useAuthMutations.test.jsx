import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import {
  useActivateAccount,
  useConfirmAccountDeletion,
  useForgotPassword,
  useLogin,
  useRegister,
  useResetPassword,
} from './useAuthMutations';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { post: vi.fn() },
    authApi: { post: vi.fn() },
  },
}));

const wrapper = ({ children }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
    }
  >
    {children}
  </QueryClientProvider>
);

async function actOrWait(fn) {
  await fn();
}
describe('useAuthMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.authApi.post.mockResolvedValue({ data: { access_token: 'tok' } });
    apiClient.api.post.mockResolvedValue({ data: {} });
  });

  it('login posts form-encoded credentials with remember_me', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    await actOrWait(async () => {
      await result.current.mutateAsync({ username: 'amy', password: 'secret', remember_me: true });
    });

    const [url, body, config] = apiClient.authApi.post.mock.calls[0];
    expect(url).toBe('/auth/login');
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(body.toString()).toBe('username=amy&password=secret&remember_me=true');
    expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('login omits remember_me when unset and passes URLSearchParams through', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    const prebuilt = new URLSearchParams('username=bob&password=pw');

    await actOrWait(async () => {
      await result.current.mutateAsync(prebuilt);
    });

    expect(apiClient.authApi.post.mock.calls[0][1]).toBe(prebuilt);
  });

  it.each([
    ['useRegister', useRegister, '/auth/register', { username: 'cat' }, { username: 'cat' }],
    [
      'useForgotPassword',
      useForgotPassword,
      '/auth/password-reset/request',
      'a@b.co',
      { email: 'a@b.co' },
    ],
    [
      'useResetPassword',
      useResetPassword,
      '/auth/password-reset/confirm',
      { token: 't', password: 'pw8chars' },
      { token: 't', new_password: 'pw8chars' },
    ],
    ['useActivateAccount', useActivateAccount, '/auth/verify-email', 'tok1', { token: 'tok1' }],
    [
      'useConfirmAccountDeletion',
      useConfirmAccountDeletion,
      '/users/delete-confirm',
      'tok2',
      { token: 'tok2' },
    ],
  ])('%s hits %s with the expected payload', async (_name, useHook, endpoint, input, payload) => {
    const { result } = renderHook(() => useHook(), { wrapper });

    await waitFor(() => result.current.mutateAsync(input));

    expect(apiClient.authApi.post).toHaveBeenCalledWith(endpoint, payload);
  });
});
