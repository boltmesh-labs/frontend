import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './ListHeader';

describe('PageHeader', () => {
  it('renders title with an optional description', () => {
    render(<PageHeader title="User Accounts" description="Manage access." />);
    expect(screen.getByRole('heading', { name: 'User Accounts' })).toBeInTheDocument();
    expect(screen.getByText('Manage access.')).toBeInTheDocument();
  });

  it('omits the description paragraph when not provided', () => {
    const { container } = render(<PageHeader title="Plans" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders children in the trailing slot', () => {
    render(
      <PageHeader title="Invoices">
        <button type="button">New</button>
      </PageHeader>
    );
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });
});
