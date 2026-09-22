import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DetailHeader } from './DetailHeader';

describe('DetailHeader', () => {
  const renderHeader = (props = {}) =>
    render(
      <MemoryRouter>
        <DetailHeader {...props} />
      </MemoryRouter>
    );

  it('renders title, optional id label and the default back button', () => {
    renderHeader({ title: 'Invoice', id: 'abc-123' });

    expect(screen.getByRole('heading', { name: 'Invoice' })).toBeInTheDocument();
    expect(screen.getByText('UUID: abc-123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to previous page' })).toBeInTheDocument();
  });

  it('supports a custom id prefix and hides the id line entirely without one', () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <DetailHeader title="Payment" id="p1" idPrefix="ID:" />
      </MemoryRouter>
    );
    expect(screen.getByText('ID: p1')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DetailHeader title="Payment" />
      </MemoryRouter>
    );
    expect(container.querySelector('.font-monospace')).toBeNull();
  });

  it('can hide the back button and show custom actions/badge', () => {
    renderHeader({
      title: 'Server',
      showBackButton: false,
      badge: <span>ONLINE</span>,
      actions: <button type="button">Restart</button>,
    });

    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
  });
});
