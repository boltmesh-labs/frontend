import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VpnServerStatusBadge } from './VpnServerStatusBadge';

describe('VpnServerStatusBadge', () => {
  it('delegates to StatusBadge with the server variant map', () => {
    render(<VpnServerStatusBadge status="online" />);
    expect(screen.getByText('online')).toBeInTheDocument();
  });

  it('falls back to the default variant for unmapped statuses', () => {
    render(<VpnServerStatusBadge status="rebooting" />);
    expect(screen.getByText('rebooting')).toBeInTheDocument();
  });
});
