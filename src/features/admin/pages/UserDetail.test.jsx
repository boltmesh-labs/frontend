import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  useToggleUserStatus,
  useUserDetail,
  useUserDevices,
  useUserSubscriptions,
  useUserInvoices,
} from '@/features/admin/hooks/useUsers';
import UserDetail from './UserDetail';

vi.mock('@/features/admin/hooks/useUsers', () => ({
  useUserDetail: vi.fn(),
  useToggleUserStatus: vi.fn(),
  useUserDevices: vi.fn(),
  useUserSubscriptions: vi.fn(),
  useUserInvoices: vi.fn(),
}));

const profile = {
  id: 'u1',
  username: 'amy',
  email: 'amy@x.io',
  role: 'admin',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

const devices = [{ id: 'd1', name: 'phone', platform: 'android', is_active: true }];
const subscriptions = [
  { id: 's1', status: 'active', expires_at: '2026-12-01T00:00:00Z', plan: { name: 'Pro' } },
];
const invoices = [
  {
    id: 'inv1',
    status: 'paid',
    payment_method: 'lightning',
    amount_paid: 10,
    currency: 'USD',
    plan: { name: 'Pro' },
  },
];

describe('UserDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToggleUserStatus).mockReturnValue({ mutate: vi.fn(), isPending: false });
    vi.mocked(useUserDevices).mockReturnValue({ data: [], isLoading: false });
    vi.mocked(useUserSubscriptions).mockReturnValue({ data: [], isLoading: false });
    vi.mocked(useUserInvoices).mockReturnValue({ data: [], isLoading: false });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/admin/users/u1']}>
        <Routes>
          <Route path="/admin/users/:id" element={<UserDetail />} />
          <Route path="*" element={<div>Elsewhere</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders the summary card plus device, subscription and invoice tables', () => {
    vi.mocked(useUserDetail).mockReturnValue({
      data: profile,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useUserDevices).mockReturnValue({ data: devices, isLoading: false });
    vi.mocked(useUserSubscriptions).mockReturnValue({ data: subscriptions, isLoading: false });
    vi.mocked(useUserInvoices).mockReturnValue({ data: invoices, isLoading: false });
    renderPage();

    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByText('amy@x.io')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate account' })).toBeInTheDocument();
    expect(screen.getAllByText('VPN Devices').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'd1' })).toHaveAttribute(
      'href',
      '/admin/vpn-devices/d1'
    );
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'inv1' })).toHaveAttribute(
      'href',
      '/admin/invoices/inv1'
    );
  });

  it('shows the not-found shell when the profile cannot load', () => {
    vi.mocked(useUserDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/could not load user profile data/i)).toBeInTheDocument();
  });
});
