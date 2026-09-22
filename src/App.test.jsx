import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import App from './App';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    authApi: { post: vi.fn() },
    setToken: vi.fn(),
    clearAuth: vi.fn(),
    onTokenRefreshed: vi.fn(() => vi.fn()),
  },
}));

const navigate = (path) => window.history.pushState({}, '', path);

const renderAppAt = async (path, expectedText) => {
  navigate(path);
  render(<App />);
  return await screen.findByText(expectedText, {}, { timeout: 5000 });
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.onTokenRefreshed.mockImplementation(() => vi.fn());
    // No persisted session: the boot refresh fails for every test here.
    apiClient.authApi.post.mockRejectedValue(new Error('no session'));
  });

  it('boots the shell and lands guests on the login page from the index route', async () => {
    const heading = await renderAppAt('/', 'Sign In');
    expect(heading).toBeInTheDocument();
    // The public layout chrome (navbar brand + footer) wraps every route.
    expect(screen.getByRole('link', { name: 'BoltMesh VPN' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('serves the legal page inside the layout without authentication', async () => {
    expect(await renderAppAt('/terms', 'Terms of Service')).toBeInTheDocument();
  });

  it('redirects unauthenticated users from protected routes to login', async () => {
    expect(await renderAppAt('/dashboard', 'Sign In')).toBeInTheDocument();
  });

  it('renders a real 404 page for unknown urls', async () => {
    expect(await renderAppAt('/does-not-exist', '404')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument();
  });
});
