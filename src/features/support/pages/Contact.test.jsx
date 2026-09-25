import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useSendContactMessage } from '../hooks/useSupport';
import Contact from './Contact';

vi.mock('../hooks/useSupport', () => ({
  useSendContactMessage: vi.fn(),
}));

const fillValidForm = async (user) => {
  await user.type(screen.getByPlaceholderText('Your Name'), 'Ann');
  await user.type(screen.getByPlaceholderText('you@example.com'), 'ann@example.com');
  await user.type(screen.getByPlaceholderText('How can we help?'), 'Need help with setup');
};

describe('Contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSendContactMessage).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    });
  });

  it('renders the support form', () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Contact Support' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('blocks submission when required fields are missing', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useSendContactMessage).mockReturnValue({ mutateAsync, isPending: false });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/please fill out all required fields/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('blocks submission for an invalid email address', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useSendContactMessage).mockReturnValue({ mutateAsync, isPending: false });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Your Name'), 'Ann');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'not-an-email');
    await user.type(screen.getByPlaceholderText('How can we help?'), 'Hello');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('sends the message and clears the form on success', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useSendContactMessage).mockReturnValue({ mutateAsync, isPending: false });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(await screen.findByText(/message has been sent successfully/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your Name')).toHaveValue('');
  });

  it('surfaces API failures inline', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      name: 'AxiosError',
      response: { data: { detail: 'Service unavailable' } },
    });
    vi.mocked(useSendContactMessage).mockReturnValue({ mutateAsync, isPending: false });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/service unavailable/i)).toBeInTheDocument();
  });

  it('disables the form while the message is sending', () => {
    vi.mocked(useSendContactMessage).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Your Name')).toBeDisabled();
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });
});
