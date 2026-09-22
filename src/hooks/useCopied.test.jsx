import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopied } from './useCopied';

describe('useCopied', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flips to copied and resets itself after the default delay', () => {
    const { result } = renderHook(() => useCopied());
    expect(result.current.copied).toBe(false);

    act(() => result.current.markCopied());
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.copied).toBe(false);
  });

  it('honors a custom reset window', () => {
    const { result } = renderHook(() => useCopied(500));

    act(() => result.current.markCopied());
    act(() => vi.advanceTimersByTime(499));
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.copied).toBe(false);
  });

  it('collapses stacked clicks into one timer', () => {
    const { result } = renderHook(() => useCopied());

    act(() => result.current.markCopied());
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.markCopied());
    act(() => vi.advanceTimersByTime(1500));
    // The second click reset the clock: still copied at t=3000ms.
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.copied).toBe(false);
  });

  it('clears the pending timer on unmount', () => {
    const { result, unmount } = renderHook(() => useCopied());
    act(() => result.current.markCopied());
    unmount();

    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});
