import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useToggleUserStatus, useUsers } from '@/features/admin/hooks/useUsers';
import UserList from './UserList';

vi.mock('@/features/admin/hooks/useUsers', () => ({
  useUsers: vi.fn(),
  useToggleUserStatus: vi.fn(),
}));

const ok = (data) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });

const users = [
  { id: 'u1', username: 'amy', email: 'amy@x.io', is_active: true, role: 'user' },
  { id: 'u2', username: 'bob', email: 'bob@x.io', is_active: false, role: 'admin' },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <UserList />
    </MemoryRouter>
  );

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToggleUserStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: null,
    });
    vi.mocked(useUsers).mockReturnValue(ok({ data: users, total_count: 2 }));
  });

  it('lists accounts with links, badges and per-row actions', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'User Accounts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'amy' })).toHaveAttribute('href', '/admin/users/u1');
    expect(screen.getByText('amy@x.io')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Activate account for bob' })).toBeInTheDocument();
  });

  it('hides the table body while loading and shows an alert on failure', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const { rerender } = renderPage();
    expect(screen.queryByRole('link', { name: 'amy' })).not.toBeInTheDocument();

    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refetch: vi.fn(),
    });
    rerender(
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('routes the toggle through the confirmation dialog', async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();
    vi.mocked(useToggleUserStatus).mockReturnValue({
      mutate: toggle,
      isPending: false,
      variables: null,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Deactivate account for amy' }));
    expect(await screen.findByText('Deactivate Account')).toBeInTheDocument();

    // Dismissing keeps the account untouched.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(toggle).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Deactivate account for amy' }));
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
    expect(toggle).toHaveBeenCalledWith({ id: 'u1', isActive: true });
  });
});
