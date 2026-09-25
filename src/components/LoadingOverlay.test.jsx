import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<LoadingOverlay show={false} message="Working..." />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows only a spinner without a message', () => {
    const { container } = render(<LoadingOverlay show />);
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
    expect(container.querySelector('p')).toBeNull();
  });

  it('shows a spinner plus the message text', () => {
    render(<LoadingOverlay show message="Saving changes..." />);
    expect(screen.getByRole('status', { name: 'Saving changes...' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(document.body.querySelector('.spinner-border')).toBeInTheDocument();
    expect(document.body.querySelector('.spinner-border')).toHaveClass('mb-2');
    expect(document.body.textContent).toContain('Saving changes...');
  });
});
