import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useConfirmAccountDeletion } from '@/features/auth/hooks/useAuthMutations';
import { AuthContext } from '@/features/auth/context/AuthContext';
import PublicRoute from '@/features/auth/components/PublicRoute';
import ConfirmDelete from './ConfirmDelete';

vi.mock('@/features/auth/hooks/useAuthMutations', () => ({
  useConfirmAccountDeletion: vi.fn(),
}));

const renderAt = (search = '', setToken = vi.fn()) =>
  render(
    <AuthContext.Provider
      value={{
        accessToken: 'existing-session',
        loading: false,
        setToken,
      }}
    >
      <MemoryRouter initialEntries={[`/confirm-delete${search}`]}>
        <Routes>
          <Route
            path="/confirm-delete"
            element={
              <PublicRoute redirectOnAuth={false}>
                <ConfirmDelete />
              </PublicRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('ConfirmDelete', () => {
  let mutate;

  beforeEach(() => {
    vi.useFakeTimers();
    mutate = vi.fn();
    vi.mocked(useConfirmAccountDeletion).mockReturnValue({ mutate });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a missing token without calling the API', () => {
    renderAt();

    expect(screen.getByText(/invalid link.*token is missing/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('clears the authenticated context before returning to login after the delay', async () => {
    const setToken = vi.fn();
    renderAt('?token=tok-1', setToken);

    const opts = mutate.mock.calls[0][1];
    act(() => {
      opts.onSuccess({});
      opts.onSettled();
    });

    expect(setToken).toHaveBeenCalledWith(null);
    expect(screen.getByText(/account has been deleted/i)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('shows the backend failure detail before bouncing back to login', async () => {
    renderAt('?token=bad');

    const opts = mutate.mock.calls[0][1];
    act(() => {
      opts.onError({ response: { data: { detail: 'Link expired' } } });
      opts.onSettled();
    });

    expect(screen.getByText('❌ Link expired')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
