import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlanMap } from './usePlanMap';

describe('usePlanMap', () => {
  it('maps plans by id', () => {
    const plans = [
      { id: 'p1', name: 'Basic' },
      { id: 'p2', name: 'Pro' },
    ];

    const { result } = renderHook(() => usePlanMap(plans));

    expect(result.current.get('p2')).toEqual({ id: 'p2', name: 'Pro' });
    expect(result.current.size).toBe(2);
  });

  it('returns an empty map when plans are unavailable', () => {
    const { result } = renderHook(() => usePlanMap(undefined));
    expect(result.current.size).toBe(0);
  });
});
