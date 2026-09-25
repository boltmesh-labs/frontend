import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/context/AuthContext';
import MainLayout from './MainLayout';

const renderLayout = async (authValue = { accessToken: null, user: null }) => {
  const view = render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<MainLayout />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
  const user = userEvent.setup();
  return { view, user };
};

describe('MainLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  it('shows the login CTA for guests and applies the default theme', async () => {
    await renderLayout();

    expect(screen.getByRole('link', { name: 'BoltMesh VPN' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content'
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });

  it('toggles the persisted color scheme', async () => {
    const { user } = await renderLayout();

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('honors a previously saved theme over the system preference', async () => {
    localStorage.setItem('theme', 'dark');
    await renderLayout();

    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('ignores an invalid saved theme', async () => {
    localStorage.setItem('theme', 'sepia');
    await renderLayout();

    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('shows dashboard navigation for signed-in users and admins only get the panel link', async () => {
    await renderLayout({ accessToken: 'tok', user: { role: 'user' }, logout: vi.fn() });

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
  });

  it('reveals the admin panel link for admin-role users', async () => {
    await renderLayout({ accessToken: 'tok', user: { role: 'admin' }, logout: vi.fn() });

    expect(screen.getByRole('link', { name: /admin panel/i })).toBeInTheDocument();
  });

  it('logs out through the context and lands on the login page afterwards', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const { user } = await renderLayout({ accessToken: 'tok', user: { role: 'user' }, logout });

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(logout).toHaveBeenCalled();
    // Logout owns its destination: the layout navigates explicitly.
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
