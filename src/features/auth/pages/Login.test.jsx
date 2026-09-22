import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthContext } from '@/features/auth/context/AuthContext';
import { useLogin } from '@/features/auth/hooks/useAuthMutations';
import { OAUTH_REDIRECT_FROM_KEY } from '@/utils/config';
import Login from './Login';

vi.mock('@/features/auth/hooks/useAuthMutations', () => ({ useLogin: vi.fn() }));

const renderLogin = (
  authValue = { accessToken: null, setAccessToken: vi.fn() },
  state = undefined
) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/devices" element={<div>Devices page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

let mutate;
describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mutate = vi.fn();
    vi.mocked(useLogin).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('submits credentials and lands on the requested destination', async () => {
    const setAccessToken = vi.fn();
    const user = userEvent.setup();
    renderLogin({ accessToken: null, setAccessToken });

    await user.type(screen.getByPlaceholderText('Enter username or email'), 'amy');
    await user.type(screen.getByPlaceholderText('Enter password'), 'secret');
    // The remember-me checkbox rides the same useForm state.
    await user.click(screen.getByLabelText('Remember me'));
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const onSuccess = mutate.mock.calls[0][1].onSuccess;
    onSuccess({ access_token: 'tok-1' });

    expect(setAccessToken).toHaveBeenCalledWith('tok-1');
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('honors a sanitized location.state.from destination after login', async () => {
    const user = userEvent.setup();
    renderLogin(undefined, { from: '/devices' });

    await user.type(screen.getByPlaceholderText('Enter username or email'), 'amy');
    await user.type(screen.getByPlaceholderText('Enter password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    mutate.mock.calls[0][1].onSuccess({ access_token: 'tok' });
    expect(await screen.findByText('Devices page')).toBeInTheDocument();
  });

  it.each([
    ['Google', 'google'],
    ['GitHub', 'github'],
  ])(
    'delegates %s logins through OAuth with the remembered destination',
    async (label, provider) => {
      const originalLocation = window.location;
      let assignedHref = '';
      delete window.location;
      window.location = {
        ...originalLocation,
        get href() {
          return assignedHref;
        },
        set href(v) {
          assignedHref = v;
        },
      };
      try {
        const user = userEvent.setup();
        renderLogin();

        await user.click(screen.getByRole('button', { name: new RegExp(label) }));

        expect(sessionStorage.getItem(OAUTH_REDIRECT_FROM_KEY)).toBe('/dashboard');
        expect(assignedHref).toContain(`/auth/${provider}?remember_me=false`);
      } finally {
        window.location = originalLocation;
      }
    }
  );

  it('surfaces API errors inline instead of navigating', async () => {
    vi.mocked(useLogin).mockReturnValue({
      mutate,
      isPending: false,
      isError: true,
      error: { response: { data: { detail: 'Invalid credentials' } } },
    });
    renderLogin();

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
