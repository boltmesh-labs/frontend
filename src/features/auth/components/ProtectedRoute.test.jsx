import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthContext } from '@/features/auth/context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const renderGuard = (authValue, requiredRole) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route
            path="/secret"
            element={
              <ProtectedRoute requiredRole={requiredRole}>
                <div>Secret content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

const readyUser = (role = 'user') => ({ accessToken: 'tok', user: { role }, loading: false });

describe('ProtectedRoute', () => {
  it('shows a session gate while the auth state is booting', () => {
    renderGuard({ accessToken: null, user: null, loading: true });
    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
  });

  it('bounces unauthenticated visitors to login', () => {
    renderGuard({ accessToken: null, user: null, loading: false });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    renderGuard(readyUser());
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('redirects users lacking the required role to /unauthorized', () => {
    renderGuard(readyUser('user'), 'admin');
    expect(screen.getByText('Unauthorized page')).toBeInTheDocument();
  });

  it.each([
    ['single match', 'admin', 'admin'],
    ['array membership', ['admin', 'support'], 'support'],
  ])('authorizes via %s', (_label, requiredRole, role) => {
    renderGuard(readyUser(role), requiredRole);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });
});
