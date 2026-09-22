import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './StatusBadge';

const VARIANT_MAP = { active: 'success', pending: 'warning', weird: 'secondary' };

describe('StatusBadge', () => {
  // The component uppercases visually via CSS only; the DOM text stays
  // lowercased humanized text.
  it('renders the underscore-humanized status with the mapped variant', () => {
    render(<StatusBadge status="partially_paid" variantMap={{ partially_paid: 'info' }} />);

    const badge = screen.getByText('partially paid');
    expect(badge).toHaveClass('badge', 'text-uppercase');
    expect(badge).toHaveClass('text-dark'); // info needs dark text for contrast
  });

  it('skips text-dark for regular variants', () => {
    render(<StatusBadge status="active" variantMap={VARIANT_MAP} />);
    expect(screen.getByText('active')).toHaveClass('bg-success');
    expect(screen.getByText('active')).not.toHaveClass('text-dark');
  });

  it('falls back to the default variant for unmapped statuses', () => {
    render(<StatusBadge status="unknown_state" variantMap={VARIANT_MAP} />);
    expect(screen.getByText('unknown state')).toHaveClass('bg-secondary');
  });

  it('renders an empty badge when the status is missing', () => {
    const { container } = render(<StatusBadge variantMap={VARIANT_MAP} />);
    expect(container.querySelector('.badge')).toBeInTheDocument();
  });
});
