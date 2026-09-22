import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useResetPassword } from '@/features/auth/hooks/useAuthMutations';
import ResetPassword from './ResetPassword';

vi.mock('@/features/auth/hooks/useAuthMutations', () => ({ useResetPassword: vi.fn() }));

const renderAt = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <ResetPassword />
    </MemoryRouter>
  );

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useResetPassword).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    });
  });

  it('warns and disables everything when the token is missing', () => {
    renderAt();

    expect(screen.getByText(/no valid reset token found/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeDisabled();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeDisabled();
  });

  it('submits the token with the chosen password and shows the backend detail', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn((_payload, opts) => opts.onSuccess({ detail: 'All set!' }));
    vi.mocked(useResetPassword).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    });
    renderAt('?token=tok-1');

    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'newpassword1');
    await user.type(screen.getByPlaceholderText(/re-enter/i), 'newpassword1');
    fireEvent.submit(document.querySelector('form'));

    expect(mutate.mock.calls[0][0]).toEqual({ token: 'tok-1', password: 'newpassword1' });
    expect(await screen.findByText('All set!')).toBeInTheDocument();
  });
});
