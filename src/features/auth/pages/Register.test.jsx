import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext } from '@/features/auth/context/AuthContext';
import { useRegister } from '@/features/auth/hooks/useAuthMutations';
import Register from './Register';

vi.mock('@/features/auth/hooks/useAuthMutations', () => ({ useRegister: vi.fn() }));

const renderRegister = () =>
  render(
    <AuthContext.Provider value={{ accessToken: null }}>
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    </AuthContext.Provider>
  );

const fillValidForm = async (user, overrides = {}) => {
  const values = {
    Username: 'amy',
    'Email Address': 'amy@x.io',
    Password: 'longenough1',
    'Confirm Password': 'longenough1',
    ...overrides,
  };
  for (const [placeholderPart, value] of Object.entries(values)) {
    if (!value) continue; // empty strings leave the field untouched
    await user.type(
      screen.getByPlaceholderText(new RegExp(`enter your ${placeholderPart}`, 'i')),
      value
    );
  }
  await user.click(screen.getByLabelText(/terms of service/i));
};

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRegister).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    });
  });

  it.each([
    [
      'all fields are required',
      { Username: '', 'Email Address': '', Password: '', 'Confirm Password': '' },
      /all fields are required/i,
    ],
    ['rejects malformed emails', { 'Email Address': 'not-an-email' }, /valid email address/i],
    [
      'enforces the minimum password length',
      { Password: 'short', 'Confirm Password': 'short' },
      /at least 8 characters/i,
    ],
    [
      'checks password confirmation',
      { 'Confirm Password': 'different123' },
      /passwords do not match/i,
    ],
  ])('%s before talking to the API', async (_label, overrides, expectedError) => {
    const user = userEvent.setup();
    renderRegister();

    await fillValidForm(user, overrides);
    if (overrides['Confirm Password'] === undefined && 'Password' in overrides) {
      // leave confirm empty on purpose for the required-fields case
    }
    fireEvent.submit(document.querySelector('form'));

    expect(await screen.findByText(expectedError)).toBeInTheDocument();
    expect(vi.mocked(useRegister).mock.results[0].value.mutate).not.toHaveBeenCalled();
  });

  it('requires terms acceptance and then submits a trimmed payload', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useRegister).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    });
    renderRegister();

    await fillValidForm(user);
    // Uncheck to exercise the terms gate first.
    await user.click(screen.getByLabelText(/terms of service/i));
    fireEvent.submit(document.querySelector('form'));
    expect(await screen.findByText(/must agree to the terms/i)).toBeInTheDocument();
    expect(vi.mocked(useRegister).mock.results[0].value.mutate).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(/terms of service/i));
    await user.type(screen.getByPlaceholderText(/enter your username/i), '  '); // trimStart coverage
    await user.clear(screen.getByPlaceholderText(/enter your username/i));
    await user.type(screen.getByPlaceholderText(/enter your username/i), 'bob');
    fireEvent.submit(document.querySelector('form'));

    // The mutation receives options as a second argument; assert on payload only.
    expect(mutate.mock.calls[0][0]).toEqual({
      username: 'bob',
      email: 'amy@x.io',
      password: 'longenough1',
    });
  });
});
