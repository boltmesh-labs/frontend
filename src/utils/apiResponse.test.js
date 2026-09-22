// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { extractList } from './apiResponse';

describe('extractList', () => {
  it('returns bare arrays untouched (same reference)', () => {
    const list = [{ id: 1 }];
    expect(extractList(list)).toBe(list);
  });

  it('unwraps a { data: [...] } envelope', () => {
    expect(extractList({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('falls back to an empty array for missing shapes', () => {
    expect(extractList(undefined)).toEqual([]);
    expect(extractList(null)).toEqual([]);
    expect(extractList({})).toEqual([]);
  });
});
