import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zero and not expired when no target is set', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.expired).toBe(false);
  });

  it('counts down the remaining time on an interval', () => {
    vi.useFakeTimers();
    const target = new Date(Date.now() + 5000).toISOString();
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.remainingMs).toBe(5000);
    expect(result.current.expired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.remainingMs).toBe(3000);
  });

  it('flags the countdown as expired once the target passes', () => {
    vi.useFakeTimers();
    const target = new Date(Date.now() + 1000).toISOString();
    const { result } = renderHook(() => useCountdown(target));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.expired).toBe(true);
  });

  it('clamps remaining time at zero past the target', () => {
    vi.useFakeTimers();
    const target = new Date(Date.now() + 1000).toISOString();
    const { result } = renderHook(() => useCountdown(target));

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.remainingMs).toBe(0);
  });

  it('invokes onExpire exactly once when the target is reached', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const target = new Date(Date.now() + 1000).toISOString();
    const { result } = renderHook(() => useCountdown(target, { onExpire }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.expired).toBe(true);
  });

  it('treats an invalid ISO target as disabled', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown('not-a-date'));
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.expired).toBe(false);
  });
});
