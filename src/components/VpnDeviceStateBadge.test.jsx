import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VpnDeviceStateBadge } from './VpnDeviceStateBadge';

describe('VpnDeviceStateBadge', () => {
  it.each([
    [true, 'Active', 'bg-success'],
    [false, 'Inactive', 'bg-secondary'],
  ])('renders the %s device state', (isActive, label, bgClass) => {
    render(<VpnDeviceStateBadge isActive={isActive} />);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass(bgClass);
    expect(badge).toHaveClass('text-uppercase');
  });
});
