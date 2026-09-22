import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from './ConfirmModal';

const renderModal = (props = {}) =>
  render(
    <ConfirmModal
      show
      onHide={vi.fn()}
      onConfirm={vi.fn()}
      title="Delete?"
      message="This cannot be undone."
      {...props}
    />
  );

describe('ConfirmModal', () => {
  it('renders the title and message', () => {
    renderModal();
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('renders nothing when hidden', () => {
    const { container } = render(
      <ConfirmModal show={false} onHide={vi.fn()} onConfirm={vi.fn()} title="Delete?" message="m" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onConfirm on confirm and onHide on cancel', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onHide = vi.fn();

    render(<ConfirmModal show onHide={onHide} onConfirm={onConfirm} title="t" message="m" />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons while a promise-resolving action is in flight', () => {
    renderModal({ loading: true });
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
