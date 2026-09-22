import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDebounce('start', 400));
    expect(result.current).toBe('start');
  });

  it('keeps the previous value until the delay elapses', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), {
      initialProps: { value: 'first' },
    });
    expect(result.current).toBe('first');

    act(() => rerender({ value: 'second' }));
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('second');
  });

  it('debounces rapid changes to a single update', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'a' },
    });

    act(() => rerender({ value: 'b' }));
    act(() => vi.advanceTimersByTime(100));
    act(() => rerender({ value: 'c' }));
    act(() => vi.advanceTimersByTime(100));
    act(() => rerender({ value: 'd' }));

    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('d');
  });
});
