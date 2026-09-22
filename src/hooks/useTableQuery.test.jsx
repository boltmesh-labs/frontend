import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTableQuery } from './useTableQuery';

const FILTERS = [
  {
    key: 'status',
    options: [],
    ariaLabel: 'Status',
    paramKey: 'is_active',
    paramValue: (v) => v === 'true',
  },
  { key: 'role', options: [], ariaLabel: 'Role' },
];

describe('useTableQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds skip/limit params for the first page by default', () => {
    const { result } = renderHook(() => useTableQuery({ pageSize: 10 }));

    expect(result.current.params).toEqual({ skip: 0, limit: 10 });
    expect(result.current.currentPage).toBe(1);
  });

  it('advances skip when the page changes', () => {
    const { result } = renderHook(() => useTableQuery({ pageSize: 10 }));

    act(() => result.current.setCurrentPage(3));

    expect(result.current.params).toEqual({ skip: 20, limit: 10 });
  });

  it('includes the trimmed search only after the debounce elapses', async () => {
    const { result } = renderHook(() => useTableQuery({ pageSize: 10 }));

    act(() => result.current.onSearchChange('  alice  '));

    // Raw input is reflected immediately, but params wait for the debounce.
    expect(result.current.searchInput).toBe('  alice  ');
    expect(result.current.params).toEqual({ skip: 0, limit: 10 });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.params).toEqual({ skip: 0, limit: 10, search: 'alice' });
  });

  it('maps filter values through paramKey/paramValue metadata', () => {
    const { result } = renderHook(() => useTableQuery({ pageSize: 10, filters: FILTERS }));

    act(() => result.current.filterConfigs[0].onChange('true'));

    expect(result.current.params).toEqual({ skip: 0, limit: 10, is_active: true });

    act(() => result.current.filterConfigs[1].onChange('admin'));

    expect(result.current.params).toEqual({ skip: 0, limit: 10, is_active: true, role: 'admin' });
  });

  it('resets to page 1 whenever the search or a filter changes', () => {
    const { result } = renderHook(() => useTableQuery({ filters: FILTERS }));

    act(() => result.current.setCurrentPage(4));
    act(() => result.current.filterConfigs[1].onChange('admin'));
    expect(result.current.currentPage).toBe(1);

    act(() => result.current.setCurrentPage(4));
    act(() => result.current.onSearchChange('bob'));
    expect(result.current.currentPage).toBe(1);
  });

  it('reports isFiltered and clears search + filters back to defaults', async () => {
    const { result } = renderHook(() => useTableQuery({ pageSize: 10, filters: FILTERS }));

    expect(result.current.isFiltered).toBe(false);

    act(() => result.current.onSearchChange('bob'));
    act(() => result.current.filterConfigs[1].onChange('admin'));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.isFiltered).toBe(true);
    expect(result.current.params).toEqual({ skip: 0, limit: 10, search: 'bob', role: 'admin' });

    act(() => result.current.clearFilters());
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.isFiltered).toBe(false);
    expect(result.current.searchInput).toBe('');
    expect(result.current.currentPage).toBe(1);
    expect(result.current.params).toEqual({ skip: 0, limit: 10 });
  });
});
