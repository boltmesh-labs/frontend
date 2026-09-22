import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InvoiceStatusBadge } from './InvoiceStatusBadge';

describe('InvoiceStatusBadge', () => {
  it('renders invoice statuses through the shared invoice variant map', () => {
    render(<InvoiceStatusBadge status="paid" />);
    expect(screen.getByText('paid')).toBeInTheDocument();
  });

  it('falls back to the default variant for unmapped statuses', () => {
    render(<InvoiceStatusBadge status="mystery_status" />);
    expect(screen.getByText('mystery status')).toBeInTheDocument();
  });
});
