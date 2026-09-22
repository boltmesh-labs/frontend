import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AdminLayout from './AdminLayout';

describe('AdminLayout', () => {
  it('renders the sidebar navigation and the routed pane outlet', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>Pane content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Users/ })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /VPN Devices/ })).toHaveAttribute(
      'href',
      '/admin/vpn-devices'
    );
    expect(screen.getByRole('link', { name: /Back to Dashboard/ })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.getByText('Pane content')).toBeInTheDocument();
  });
});
