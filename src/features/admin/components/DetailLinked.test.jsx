import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LinkedCard } from './DetailLinked';

describe('LinkedCard', () => {
  it('links the uuid to the target url with a label', () => {
    render(
      <MemoryRouter>
        <LinkedCard uuid="sub-9" label="Subscription" targetUrl="/admin/subscriptions/sub-9" />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'sub-9' });
    expect(link).toHaveAttribute('href', '/admin/subscriptions/sub-9');
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it.each([
    ['missing uuid', undefined, '/admin/invoices/i1'],
    ['missing url', 'i1', undefined],
  ])('renders nothing when %s', (_label, uuid, targetUrl) => {
    const { container } = render(
      <MemoryRouter>
        <LinkedCard uuid={uuid} label="X" targetUrl={targetUrl} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
