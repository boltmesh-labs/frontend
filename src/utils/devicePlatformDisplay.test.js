// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PLATFORM_MAP, PLATFORM_OPTIONS, getPlatformLabel } from './devicePlatformDisplay';

describe('devicePlatformDisplay', () => {
  it('exposes the full platform map', () => {
    expect(PLATFORM_MAP).toEqual({
      android: 'Android',
      ios: 'iOS',
      windows: 'Windows',
      macos: 'macOS',
      linux: 'Linux',
      other: 'Other',
    });
  });

  it('derives options from the map', () => {
    expect(PLATFORM_OPTIONS).toEqual(
      Object.entries(PLATFORM_MAP).map(([value, label]) => ({ value, label }))
    );
  });

  it('returns em-dash for nullish keys', () => {
    expect(getPlatformLabel(null)).toBe('—');
    expect(getPlatformLabel(undefined)).toBe('—');
  });

  it('maps known keys case-insensitively', () => {
    expect(getPlatformLabel('android')).toBe('Android');
    expect(getPlatformLabel('MACOS')).toBe('macOS');
  });

  it('falls back to the raw key for unknown platforms', () => {
    expect(getPlatformLabel('templeos')).toBe('templeos');
  });
});
