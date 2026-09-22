import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthContext } from '@/features/auth/context/AuthContext';
import PublicRoute from './PublicRoute';

const renderGuard = (authValue, guardProps = {}) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute {...guardProps}>
                <div>Public content</div>
              </PublicRoute>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('PublicRoute', () => {
  it('shows the loading gate while auth boots', () => {
    renderGuard({ accessToken: null, loading: true });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects already-authenticated users to the dashboard by default', () => {
    renderGuard({ accessToken: 'tok', loading: false });
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('lets token-consuming pages opt out of the authenticated redirect', () => {
    renderGuard({ accessToken: 'tok', loading: false }, { redirectOnAuth: false });
    expect(screen.getByText('Public content')).toBeInTheDocument();
  });

  it('renders children for anonymous visitors', () => {
    renderGuard({ accessToken: null, loading: false });
    expect(screen.getByText('Public content')).toBeInTheDocument();
  });
});
