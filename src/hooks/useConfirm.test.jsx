import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useConfirm } from './useConfirm';

const Harness = () => {
  const { confirm, confirmDialog } = useConfirm();
  const [result, setResult] = useState(null);

  return (
    <div>
      <button type="button" onClick={async () => setResult(await confirm({ message: 'Proceed?' }))}>
        ask
      </button>
      <span data-testid="result">{String(result)}</span>
      {confirmDialog}
    </div>
  );
};

describe('useConfirm', () => {
  it('resolves true when the user confirms', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'ask' }));
    expect(screen.getByText('Proceed?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByTestId('result')).toHaveTextContent('true');
    // The dialog stays mounted through its exit transition instead of being
    // force-remounted on close, so wait for the animated unmount.
    await waitFor(() => expect(screen.queryByText('Proceed?')).not.toBeInTheDocument());
  });

  it('resolves false when the user cancels', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'ask' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('result')).toHaveTextContent('false');
    await waitFor(() => expect(screen.queryByText('Proceed?')).not.toBeInTheDocument());
  });

  it('falls back to default copy', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'ask' }));

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Proceed?')).toBeInTheDocument();
  });
});
