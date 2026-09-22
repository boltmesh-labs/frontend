import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVpnNodeAudit } from '@/features/admin/hooks/useVpnNodeAudit';
import VpnServerAuditList from './VpnServerAuditList';

vi.mock('@/features/admin/hooks/useVpnNodeAudit', () => ({
  useVpnNodeAudit: vi.fn(),
}));

const logs = [
  {
    id: 'log1',
    server_name: 'edge-01',
    region_id: 'fra',
    auth_method: 'aws_iid',
    status: 'success',
    ip_address: '198.51.100.1',
    created_at: '2026-01-02T03:04:05Z',
  },
];

describe('VpnServerAuditList (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useVpnNodeAudit).mockReturnValue({
      data: { data: logs, total_count: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders audit rows with auth method and status badges', () => {
    render(<VpnServerAuditList />);

    expect(screen.getByText('edge-01')).toBeInTheDocument();
    expect(screen.getByText('aws_iid')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('198.51.100.1')).toBeInTheDocument();
    expect(screen.getByText('fra')).toBeInTheDocument();
  });

  it('renders the empty state when no audit events are returned', () => {
    vi.mocked(useVpnNodeAudit).mockReturnValue({
      data: { data: [], total_count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<VpnServerAuditList />);

    expect(screen.getByText('No registration audit events found.')).toBeInTheDocument();
  });
});
