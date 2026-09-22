import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';

import { apiClient } from '@/api/client';
import AccountSettings from './AccountSettings';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { get: vi.fn(), patch: vi.fn(), put: vi.fn(), post: vi.fn() },
  },
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Test-friendly stand-in for the real ConfirmModal so useConfirm's promise
// flow can be exercised without booting react-bootstrap's Modal portal.
vi.mock('@/components/ConfirmModal', () => ({
  ConfirmModal: ({
    show,
    onHide,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText = 'Cancel',
  }) =>
    show ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{typeof message === 'string' ? message : null}</p>
        <button type="button" onClick={onConfirm}>
          {confirmText}
        </button>
        <button type="button" onClick={onHide}>
          {cancelText}
        </button>
      </div>
    ) : null,
}));

const profileUser = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  is_verified: true,
  plan: null,
};

const renderAccountSettings = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Both tab panes stay mounted (react-bootstrap hides inactive ones), so scope
// field lookups to the card that owns the label instead of relying on global
// uniqueness of duplicated labels like "Current Password".
const profileCard = () => screen.getByText('Personal Profile').closest('.card');
const securityCard = () => screen.getByText('Change Password').closest('.card');

describe('AccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.api.get.mockResolvedValue({ data: profileUser });
  });

  describe('Profile Settings confirm dialog', () => {
    it('asks for confirmation before saving and sends the API call only after confirming', async () => {
      apiClient.api.patch.mockResolvedValue({ data: { ...profileUser } });
      const user = userEvent.setup();
      renderAccountSettings();

      const submit = await screen.findByRole('button', { name: /save profile changes/i });
      const passwordInput = within(profileCard()).getByLabelText('Current Password');
      await user.type(passwordInput, 'secret');
      await user.click(submit);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Save Profile Changes?')).toBeInTheDocument();
      expect(apiClient.api.patch).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

      await waitFor(() =>
        expect(apiClient.api.patch).toHaveBeenCalledWith('/users', {
          username: 'alice',
          email: 'alice@example.com',
          current_password: 'secret',
        })
      );
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully.');
      await waitFor(() => expect(passwordInput).toHaveValue(''));
    });

    it('does not call the API when the confirm dialog is dismissed', async () => {
      const user = userEvent.setup();
      renderAccountSettings();

      const submit = await screen.findByRole('button', { name: /save profile changes/i });
      await user.type(within(profileCard()).getByLabelText('Current Password'), 'secret');
      await user.click(submit);

      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));

      expect(apiClient.api.patch).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows exactly one error toast when saving fails (no double toast)', async () => {
      apiClient.api.patch.mockRejectedValue({
        response: { data: { detail: 'Current password is incorrect.' } },
      });
      const user = userEvent.setup();
      renderAccountSettings();

      const submit = await screen.findByRole('button', { name: /save profile changes/i });
      await user.type(within(profileCard()).getByLabelText('Current Password'), 'wrong');
      await user.click(submit);

      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: /save changes/i })
      );

      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
      expect(toast.error).toHaveBeenCalledWith('Current password is incorrect.');
    });
  });

  describe('Change Password confirm dialog', () => {
    const openSecurityTab = async (user) => {
      await user.click(await screen.findByText('🔒 Security'));
      return securityCard();
    };

    it('asks for confirmation before changing the password', async () => {
      apiClient.api.put.mockResolvedValue({ data: { ok: true } });
      const user = userEvent.setup();
      renderAccountSettings();

      const card = await openSecurityTab(user);
      await user.type(within(card).getByLabelText('New Password'), 'NewSecret123');
      await user.type(within(card).getByLabelText('Confirm New Password'), 'NewSecret123');
      await user.type(within(card).getByLabelText('Current Password'), 'OldSecret1');

      await user.click(within(card).getByRole('button', { name: /update password/i }));

      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.getByText('Update Password?')).toBeInTheDocument();
      await user.click(dialog.getByRole('button', { name: /update password/i }));

      await waitFor(() =>
        expect(apiClient.api.put).toHaveBeenCalledWith('/users/change-password', {
          current_password: 'OldSecret1',
          new_password: 'NewSecret123',
        })
      );
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Password updated successfully.');
    });

    it('keeps validation errors in front of the confirm dialog', async () => {
      const user = userEvent.setup();
      renderAccountSettings();

      const card = await openSecurityTab(user);
      await user.type(within(card).getByLabelText('New Password'), 'NewSecret123');
      await user.type(within(card).getByLabelText('Confirm New Password'), 'SomethingElse');
      await user.type(within(card).getByLabelText('Current Password'), 'OldSecret1');

      await user.click(within(card).getByRole('button', { name: /update password/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith('New passwords do not match.');
      expect(apiClient.api.put).not.toHaveBeenCalled();
    });
  });

  describe('Delete Account keeps its typed-DELETE guard', () => {
    it('does not wrap the deletion request in a confirm dialog', async () => {
      const user = userEvent.setup();
      renderAccountSettings();

      await user.click(await screen.findByText('⚠️ Delete Account'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const dangerCard = screen.getByText('Danger Zone').closest('.card');
      const deleteButton = within(dangerCard).getByRole('button', { name: /^delete account$/i });
      expect(deleteButton).toBeDisabled();
    });
  });
});
