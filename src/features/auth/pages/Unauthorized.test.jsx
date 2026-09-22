import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Unauthorized from './Unauthorized';

describe('Unauthorized', () => {
  it('renders the access-denied card with a back action', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <MemoryRouter>
        <Unauthorized />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Padlock' })).toBeInTheDocument();
    // navigate(-1) is exercised; history.back on an empty stack is a no-op.
    await user.click(screen.getByRole('button', { name: 'Go Back' }));
  });
});
