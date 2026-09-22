import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OAuthCallback from './OAuthCallback';

const setAccessTokenMock = vi.hoisted(() => vi.fn());
const refreshPostMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ setAccessToken: setAccessTokenMock }),
}));

vi.mock('@/api/client', () => ({
  apiClient: { authApi: { post: (...args) => refreshPostMock(...args) } },
}));

const renderCallback = (route) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/dashboard" element={<div>dashboard-reached</div>} />
          <Route path="/subscriptions" element={<div>subscriptions-reached</div>} />
          <Route path="/login" element={<div>login-reached</div>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>
  );

describe('OAuthCallback', () => {
  beforeEach(() => {
    setAccessTokenMock.mockClear();
    refreshPostMock.mockReset();
    refreshPostMock.mockRejectedValue(new Error('no session'));
    window.history.replaceState(null, '', '/auth/callback');
  });

  it('ignores a token in the URL fragment and uses silent refresh instead', async () => {
    window.history.replaceState(null, '', '/auth/callback#token=frag-token-123');
    refreshPostMock.mockResolvedValueOnce({ data: { access_token: 'silent-token-123' } });
    sessionStorage.setItem('oauth_redirect_from', '/subscriptions');

    renderCallback('/auth/callback');

    expect(await screen.findByText('subscriptions-reached')).toBeInTheDocument();
    expect(setAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(setAccessTokenMock).toHaveBeenCalledWith('silent-token-123');
    expect(sessionStorage.getItem('oauth_redirect_from')).toBeNull();
  });

  it('defaults to /dashboard when no redirect origin was stored', async () => {
    refreshPostMock.mockResolvedValueOnce({ data: { access_token: 'silent-token-456' } });

    renderCallback('/auth/callback');

    expect(await screen.findByText('dashboard-reached')).toBeInTheDocument();
    expect(setAccessTokenMock).toHaveBeenCalledWith('silent-token-456');
  });

  it('ignores the access_token alias in the fragment', async () => {
    window.history.replaceState(null, '', '/auth/callback#access_token=alias-token');
    refreshPostMock.mockResolvedValueOnce({ data: { access_token: 'silent-token-alias' } });

    renderCallback('/auth/callback');

    expect(await screen.findByText('dashboard-reached')).toBeInTheDocument();
    expect(setAccessTokenMock).toHaveBeenCalledWith('silent-token-alias');
  });

  it('rejects a token delivered via the query string (no Referer-safe channel)', async () => {
    renderCallback('/auth/callback?token=qs-token-evil');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Authentication failed. No access token was received.'
    );
    expect(setAccessTokenMock).not.toHaveBeenCalled();
    expect(screen.queryByText('dashboard-reached')).not.toBeInTheDocument();
  });

  it('rejects an access_token delivered via the query string', async () => {
    renderCallback('/auth/callback?access_token=qs-token-evil');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Authentication failed. No access token was received.'
    );
    expect(setAccessTokenMock).not.toHaveBeenCalled();
  });

  it('surfaces the backend error message from the query string', async () => {
    renderCallback('/auth/callback?error=Account%20is%20suspended%20or%20disabled.');

    expect(await screen.findByRole('alert')).toHaveTextContent('Account is suspended or disabled.');
    expect(setAccessTokenMock).not.toHaveBeenCalled();
  });

  it('navigates back to login from the error state', async () => {
    const user = userEvent.setup();

    renderCallback('/auth/callback?error=OAuth%20sign-in%20failed.');
    await user.click(await screen.findByRole('button', { name: 'Return to Login' }));

    expect(await screen.findByText('login-reached')).toBeInTheDocument();
  });

  it('uses silent refresh on the bare callback redirect', async () => {
    refreshPostMock.mockResolvedValueOnce({ data: { access_token: 'silent-token-789' } });
    sessionStorage.setItem('oauth_redirect_from', '/dashboard');

    renderCallback('/auth/callback');

    expect(await screen.findByText('dashboard-reached')).toBeInTheDocument();
    expect(refreshPostMock).toHaveBeenCalledWith('/auth/refresh-token');
    expect(setAccessTokenMock).toHaveBeenCalledWith('silent-token-789');
  });

  it('shows an error when silent refresh has no session', async () => {
    refreshPostMock.mockRejectedValueOnce(new Error('no cookie'));

    renderCallback('/auth/callback');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Authentication failed. No access token was received.'
    );
    expect(setAccessTokenMock).not.toHaveBeenCalled();
  });
});
