import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DashboardHeader } from './DashboardHeader';

describe('DashboardHeader', () => {
  it('renders title and subtitle with a default back button', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <MemoryRouter initialEntries={['/subscriptions']}>
        <Routes>
          <Route
            path="/subscriptions"
            element={<DashboardHeader title="Subscriptions" subtitle="Manage plans" />}
          />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Subscriptions' })).toBeInTheDocument();
    expect(screen.getByText('Manage plans')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('supports custom destinations and hides the button when backTo is empty', () => {
    const { rerender } = render(
      <MemoryRouter>
        <DashboardHeader title="T" backTo="/somewhere" backLabel="Go" rightAction={<b>x</b>} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DashboardHeader title="T" backTo={null} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
