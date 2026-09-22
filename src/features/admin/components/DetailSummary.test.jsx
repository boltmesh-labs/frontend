import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DetailSummary } from './DetailSummary';

describe('DetailSummary', () => {
  it('renders the status header, badge and key-value rows', () => {
    render(
      <DetailSummary
        statusLabel="Account Status"
        badge={<span data-testid="badge">ACTIVE</span>}
        items={[
          { label: 'Username', value: 'amy' },
          null, // rows must tolerate holes in sparse arrays
          { label: 'Email', value: null, className: 'muted' },
        ]}
      />
    );

    expect(screen.getByText('Account Status')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByText('Username:')).toBeInTheDocument();
    expect(screen.getByText('amy')).toBeInTheDocument();
    // Null values fall back to N/A.
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders without a header or table when neither is provided', () => {
    const { container } = render(<DetailSummary>Only children</DetailSummary>);

    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('.border-bottom')).toBeNull();
    expect(screen.getByText('Only children')).toBeInTheDocument();
  });
});
