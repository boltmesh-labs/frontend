// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatDate, formatUptime } from './dateFormatter';

describe('formatDate', () => {
  it('returns "-" for nullish values', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('returns "-" for invalid date strings', () => {
    expect(formatDate('not-a-date')).toBe('-');
    expect(formatDate('2026-13-99')).toBe('-');
  });

  it('formats valid ISO dates', () => {
    const result = formatDate('2026-08-07T12:34:56Z');
    expect(result).toContain('2026');
    expect(result).toContain('Aug');
  });
});

describe('formatUptime', () => {
  it('returns em-dash for nullish or invalid values', () => {
    expect(formatUptime(null)).toBe('—');
    expect(formatUptime(undefined)).toBe('—');
    expect(formatUptime('abc')).toBe('—');
    expect(formatUptime(-10)).toBe('—');
  });

  it('returns 0m for zero seconds', () => {
    expect(formatUptime(0)).toBe('0m');
  });

  it('formats sub-minute uptimes as 0m', () => {
    expect(formatUptime(45)).toBe('0m');
  });

  it('formats hours and minutes', () => {
    expect(formatUptime(3600 + 30 * 60)).toBe('1h 30m');
  });

  it('formats days, hours and minutes', () => {
    expect(formatUptime(2 * 86400 + 5 * 3600 + 12 * 60)).toBe('2d 5h 12m');
  });

  it('omits hours when there are none but keeps minutes', () => {
    expect(formatUptime(90)).toBe('1m');
  });
});
