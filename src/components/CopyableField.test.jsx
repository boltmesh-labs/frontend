import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { copyToClipboard } from '@/utils/clipboard';
import { CopyableField } from './CopyableField';

vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

describe('CopyableField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    copyToClipboard.mockResolvedValue(true);
  });

  it('renders nothing when there is no value to show', () => {
    const { container } = render(<CopyableField label="Key" value="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the value and copies it with the toast labels', async () => {
    const user = userEvent.setup();
    render(<CopyableField label="Public Key" value="wg-key-123" />);

    expect(screen.getByText('Public Key')).toBeInTheDocument();
    expect(screen.getByText('wg-key-123')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy Public Key' }));

    await waitFor(() =>
      expect(copyToClipboard).toHaveBeenCalledWith('wg-key-123', {
        success: 'Public Key copied to clipboard!',
        error: 'Failed to copy public key.',
      })
    );
    // Successful copy disables the button until useCopied resets the flag.
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
  });

  it('masks sensitive values and supports a custom toast label', async () => {
    const user = userEvent.setup();
    render(<CopyableField label="Token" value="secret-value" toastLabel="API token" sensitive />);

    expect(screen.queryByText('secret-value')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy Token' }));

    await waitFor(() =>
      expect(copyToClipboard).toHaveBeenCalledWith(
        'secret-value',
        expect.objectContaining({ success: 'API token copied to clipboard!' })
      )
    );
  });

  it('keeps the copy button enabled when the clipboard write fails', async () => {
    const user = userEvent.setup();
    copyToClipboard.mockResolvedValue(false);
    render(<CopyableField value="abc" toastLabel="Value" />);

    await user.click(screen.getByRole('button'));

    // didCopy === false must not mark the field as copied.
    expect(screen.getByRole('button')).toBeEnabled();
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
  });

  it('applies the truncate class only when requested and prefers an explicit title', () => {
    const { rerender } = render(<CopyableField value="long-value" truncate />);
    expect(screen.getByTitle('long-value')).toHaveClass('text-truncate');

    rerender(<CopyableField value="wrapped" title="Fixed tooltip" />);
    expect(screen.getByTitle('Fixed tooltip')).toHaveClass('text-break');
  });
});
