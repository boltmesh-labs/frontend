import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoader } from './PageLoader';

describe('PageLoader', () => {
  it('renders a busy status with a spinner by default', () => {
    render(<PageLoader />);

    const status = screen.getByRole('status', { name: 'Loading' });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('renders an optional message', () => {
    render(<PageLoader message="Retrieving details..." />);
    expect(screen.getByText('Retrieving details...')).toBeInTheDocument();
  });

  it('is fullscreen by default', () => {
    const { container } = render(<PageLoader />);
    expect(container.querySelector('div')).toHaveClass('min-vh-100');
  });

  it('can render in a compact non-fullscreen variant', () => {
    const { container } = render(<PageLoader fullscreen={false} />);
    expect(container.querySelector('div')).not.toHaveClass('min-vh-100');
  });

  it('merges extra classes into the root wrapper', () => {
    const { container } = render(<PageLoader fullscreen={false} className="py-5" />);
    expect(container.firstChild).toHaveClass('py-5');
    expect(container.firstChild).not.toHaveClass('min-vh-100');
  });
});
