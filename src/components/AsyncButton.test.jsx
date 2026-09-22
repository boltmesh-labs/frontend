import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AsyncButton } from './AsyncButton';

describe('AsyncButton', () => {
  it('renders children when not loading', () => {
    render(<AsyncButton>Save</AsyncButton>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a spinner and keeps the default label while loading', () => {
    render(<AsyncButton loading>Save</AsyncButton>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('swaps the label for loadingLabel while loading', () => {
    render(
      <AsyncButton loading loadingLabel="Saving...">
        Save
      </AsyncButton>
    );
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('is disabled while loading even if disabled is not passed', () => {
    render(<AsyncButton loading>Save</AsyncButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('honours an explicit disabled prop when not loading', () => {
    render(<AsyncButton disabled>Save</AsyncButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards extra button props', () => {
    render(
      <AsyncButton variant="danger" aria-label="custom label">
        Save
      </AsyncButton>
    );
    const button = screen.getByRole('button', { name: 'custom label' });
    expect(button).toHaveClass('btn-danger');
  });
});
