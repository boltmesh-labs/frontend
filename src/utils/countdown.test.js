// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatCountdown } from './countdown';

describe('formatCountdown', () => {
  it('renders mm:ss by default', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(5000)).toBe('00:05');
    expect(formatCountdown(65 * 1000)).toBe('01:05');
  });

  it('renders hh:mm:ss once an hour passes', () => {
    expect(formatCountdown(3600 * 1000)).toBe('01:00:00');
    expect(formatCountdown((3600 + 90) * 1000)).toBe('01:01:30');
  });

  it('renders the long style', () => {
    expect(formatCountdown(5000, 'long')).toBe('5s');
    expect(formatCountdown(65 * 1000, 'long')).toBe('1m 5s');
    expect(formatCountdown((3600 + 300) * 1000, 'long')).toBe('1h 5m');
  });

  it('clamps negative durations to zero', () => {
    expect(formatCountdown(-1000)).toBe('00:00');
    expect(formatCountdown(-1000, 'long')).toBe('0s');
  });

  it('truncates fractional seconds', () => {
    expect(formatCountdown(1500)).toBe('00:01');
  });
});
