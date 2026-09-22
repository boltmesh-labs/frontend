import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserRoleBadge, UserStateBadge, UserVerifiedBadge } from './UserBadges';

describe('UserBadge exports', () => {
  it.each([
    ['admin', 'bg-danger'],
    ['user', 'bg-secondary'],
  ])('UserRoleBadge maps %s through userRoleVariant', (role, expectedBg) => {
    render(<UserRoleBadge role={role} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent(role);
    expect(badge).toHaveClass(expectedBg);
    expect(badge).not.toHaveClass('text-dark');
  });

  it('defaults to an unknown role with the fallback variant', () => {
    render(<UserRoleBadge />);
    expect(screen.getByRole('status')).toHaveTextContent('unknown');
  });

  it.each([
    [true, 'Active', 'bg-success'],
    [false, 'Inactive', 'bg-danger'],
  ])('UserStateBadge renders the %s state', (isActive, label, expectedBg) => {
    render(<UserStateBadge isActive={isActive} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveClass(expectedBg);
  });

  it.each([
    [true, 'Verified', 'bg-success'],
    [false, 'Unverified', 'bg-warning'],
  ])('UserVerifiedBadge renders verification state', (isVerified, label, expectedBg) => {
    render(<UserVerifiedBadge isVerified={isVerified} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveClass(expectedBg);
    if (!isVerified) {
      expect(badge).toHaveClass('text-dark');
    }
  });
});
