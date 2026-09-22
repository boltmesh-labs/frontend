// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatBytes } from './byteFormatter';

describe('formatBytes', () => {
  it('returns em-dash for nullish or invalid values', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes('abc')).toBe('—');
    expect(formatBytes(-5)).toBe('—');
  });

  it('formats zero as plain bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats plain bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes with default decimals', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(2 * 1024 ** 3)).toBe('2 GB');
  });

  it('respects the decimals parameter', () => {
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
  });

  it('clamps negative decimals to zero', () => {
    expect(formatBytes(1536, -1)).toBe('2 KB');
  });

  it('caps at the largest supported unit', () => {
    expect(formatBytes(5 * 1024 ** 7)).toBe('5242880 PB');
  });
});
