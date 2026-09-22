// @vitest-environment node
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getPaginationTotals } from './pagination';

describe('getPaginationTotals', () => {
  it('prefers the server total_count', () => {
    expect(getPaginationTotals({ data: [{}, {}], total_count: 42 }, 10)).toEqual({
      totalCount: 42,
      totalPages: 5,
    });
  });

  it('falls back to the current page length when total_count is missing', () => {
    expect(getPaginationTotals({ data: [{}, {}, {}] }, 10)).toEqual({
      totalCount: 3,
      totalPages: 1,
    });
  });

  it('handles missing data and always yields at least one page', () => {
    expect(getPaginationTotals(undefined, 10)).toEqual({ totalCount: 0, totalPages: 1 });
    expect(getPaginationTotals({ data: [], total_count: 0 }, 10)).toEqual({
      totalCount: 0,
      totalPages: 1,
    });
  });
});
