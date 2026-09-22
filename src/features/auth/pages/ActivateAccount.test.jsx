import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthContext } from '@/features/auth/context/AuthContext';
import { useActivateAccount } from '@/features/auth/hooks/useAuthMutations';
import ActivateAccount from './ActivateAccount';

vi.mock('@/features/auth/hooks/useAuthMutations', () => ({
  useActivateAccount: vi.fn(),
}));

const renderAt = (search = '') =>
  render(
    <AuthContext.Provider value={{ setAccessToken: vi.fn() }}>
      <MemoryRouter initialEntries={[`/verify-email${search}`]}>
        <Routes>
          <Route path="/verify-email" element={<ActivateAccount />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('ActivateAccount', () => {
  let mutate;
  let resolveActivation;
  let rejectActivation;

  beforeEach(() => {
    vi.useFakeTimers();
    mutate = vi.fn(
      () =>
        new Promise((resolve, reject) => {
          resolveActivation = resolve;
          rejectActivation = reject;
        })
    );
    vi.mocked(useActivateAccount).mockReturnValue({ mutateAsync: mutate });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a missing token without calling the API', () => {
    renderAt();

    expect(screen.getByText(/invalid activation link.*token is missing/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('activates, stores the session token and redirects to the dashboard', async () => {
    const setAccessToken = vi.fn();
    const view = render(
      <AuthContext.Provider value={{ setAccessToken }}>
        <MemoryRouter initialEntries={['/verify-email?token=tok']}>
          <Routes>
            <Route path="/verify-email" element={<ActivateAccount />} />
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // The mutation fires on mount with the bare token.
    await act(async () => {
      resolveActivation({ access_token: 'jwt-1' });
      await Promise.resolve();
    });

    expect(screen.getByText(/account activated/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(setAccessToken).toHaveBeenCalledWith('jwt-1');
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    view.unmount();
  });

  it.each([
    [409, '⚠️ Account is already activated. Redirecting...'],
    [400, '❌ nope'],
  ])('surfaces %s failures before bouncing back to the dashboard', async (status, expected) => {
    render(
      <AuthContext.Provider value={{ setAccessToken: vi.fn() }}>
        <MemoryRouter initialEntries={['/verify-email?token=bad']}>
          <Routes>
            <Route path="/verify-email" element={<ActivateAccount />} />
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await act(async () => {
      rejectActivation({ response: { status, data: { detail: 'nope' } } });
      await Promise.resolve();
    });

    expect(screen.getByText(expected)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });
});
