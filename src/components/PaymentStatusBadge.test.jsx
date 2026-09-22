import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PaymentStatusBadge } from './PaymentStatusBadge';

describe('PaymentStatusBadge', () => {
  it('renders payment statuses through the shared payment variant map', () => {
    render(<PaymentStatusBadge status="succeeded" />);
    expect(screen.getByText('succeeded')).toBeInTheDocument();
  });

  it('falls back to the default variant for unmapped statuses', () => {
    render(<PaymentStatusBadge status="unknown_state" />);
    expect(screen.getByText('unknown state')).toBeInTheDocument();
  });
});
