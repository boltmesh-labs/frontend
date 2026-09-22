import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useForgotPassword } from '@/features/auth/hooks/useAuthMutations';
import ForgotPassword from './ForgotPassword';

vi.mock('@/features/auth/hooks/useAuthMutations', () => ({
  useForgotPassword: vi.fn(),
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trims the email and clears the field through the success callback', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn((_payload, opts) => opts.onSuccess({}));
    vi.mocked(useForgotPassword).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    });
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('name@example.com'), '  amy@x.io  ');
    fireEvent.submit(document.querySelector('form'));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toBe('amy@x.io');
    await waitFor(() => expect(screen.getByPlaceholderText('name@example.com')).toHaveValue(''));
  });

  it('shows the confirmation banner once the mutation succeeds', () => {
    vi.mocked(useForgotPassword).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: true,
    });
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    expect(screen.getByText(/instructions have been sent/i)).toBeInTheDocument();
  });

  it('surfaces API failures inline', () => {
    vi.mocked(useForgotPassword).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: { response: { data: { detail: 'Too many requests' } } },
      isSuccess: false,
    });
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    expect(screen.getByText('Too many requests')).toBeInTheDocument();
  });
});
