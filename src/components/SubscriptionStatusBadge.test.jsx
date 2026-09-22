import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';

describe('SubscriptionStatusBadge', () => {
  it('renders subscription statuses through the shared variant map', () => {
    render(<SubscriptionStatusBadge status="grace_period" />);
    expect(screen.getByText('grace period')).toBeInTheDocument();
  });

  it('falls back to the default variant for unmapped statuses', () => {
    render(<SubscriptionStatusBadge status="archived" />);
    expect(screen.getByText('archived')).toBeInTheDocument();
  });
});
