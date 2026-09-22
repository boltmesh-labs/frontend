import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AccountOwnerCard } from './DetailAccount';

describe('AccountOwnerCard', () => {
  it('links to the owner profile and shows contact details', () => {
    render(
      <MemoryRouter>
        <AccountOwnerCard user={{ id: 'u1', username: 'amy', email: 'amy@x.io' }} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'amy' });
    expect(link).toHaveAttribute('href', '/admin/users/u1');
    expect(screen.getByText('amy@x.io')).toBeInTheDocument();
    // The avatar shows the uppercased first letter of the username.
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('falls back to a question-mark avatar for placeholder usernames', () => {
    render(
      <MemoryRouter>
        <AccountOwnerCard user={{ id: 'u2', username: 'N/A', email: '-' }} />
      </MemoryRouter>
    );
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
