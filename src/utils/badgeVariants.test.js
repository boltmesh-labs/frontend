// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  badgeClassName,
  getStatusVariant,
  invoiceStatusVariant,
  subscriptionStatusVariant,
} from './badgeVariants';

describe('getStatusVariant', () => {
  it('maps known statuses to variants case-insensitively', () => {
    expect(getStatusVariant('PAID', invoiceStatusVariant)).toBe('success');
    expect(getStatusVariant('pending', invoiceStatusVariant)).toBe('warning');
  });

  it('falls back to secondary for unknown statuses', () => {
    expect(getStatusVariant('mystery', invoiceStatusVariant)).toBe('secondary');
    expect(getStatusVariant('', invoiceStatusVariant)).toBe('secondary');
    expect(getStatusVariant(undefined, invoiceStatusVariant)).toBe('secondary');
  });

  it('works with any variant map', () => {
    expect(getStatusVariant('active', subscriptionStatusVariant)).toBe('success');
    expect(getStatusVariant('grace_period', subscriptionStatusVariant)).toBe('info');
  });
});

describe('badgeClassName', () => {
  it('adds dark text for light warning/info backgrounds', () => {
    expect(badgeClassName('warning')).toBe('text-uppercase px-2 py-1 small text-dark');
    expect(badgeClassName('info')).toBe('text-uppercase px-2 py-1 small text-dark');
  });

  it('omits dark text for regular variants', () => {
    expect(badgeClassName('success')).toBe('text-uppercase px-2 py-1 small');
    expect(badgeClassName('secondary')).not.toContain('text-dark');
  });
});
