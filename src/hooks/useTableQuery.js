import { useCallback, useMemo, useState } from 'react';

import { useDebounce } from '@/hooks/useDebounce';
import { DEFAULT_PAGE_SIZE } from '@/utils/config';

const SEARCH_DEBOUNCE_MS = 400;

const emptyFilterValues = (filters) => Object.fromEntries(filters.map((f) => [f.key, '']));

/**
 * Shared state machine for paginated/filterable list pages (search box +
 * select filters + pagination). Owns the pieces every admin table previously
 * copy-pasted: raw vs debounced search state, page reset on query changes,
 * skip/limit param construction, and the filter-config list consumed by
 * TableFiltersBar.
 *
 * Filter definitions drive param mapping declaratively:
 *   - `key`      state field and (by default) the API query param name
 *   - `paramKey` override when the API param differs (e.g. `is_active`)
 *   - `paramValue` transform for the API value (e.g. 'true' -> true)
 *
 * @param {Object} [options]
 * @param {number} [options.pageSize=DEFAULT_PAGE_SIZE]
 * @param {Array}  [options.filters=[]] - see shape above
 * @param {number} [options.debounceMs=400]
 * @returns {{
 *   currentPage: number, setCurrentPage: (n: number) => void,
 *   pageSize: number, searchInput: string, debouncedSearch: string,
 *   onSearchChange: (v: string) => void, clearFilters: () => void,
 *   isFiltered: boolean, params: Object,
 *   filterConfigs: Array<{ value: string, onChange: (v: string) => void, options: Array, ariaLabel: string }>,
 * }}
 */
export const useTableQuery = ({
  pageSize = DEFAULT_PAGE_SIZE,
  filters = [],
  debounceMs = SEARCH_DEBOUNCE_MS,
} = {}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filterValues, setFilterValues] = useState(() => emptyFilterValues(filters));

  const debouncedSearch = useDebounce(searchInput, debounceMs);

  const onSearchChange = useCallback((value) => {
    setSearchInput(value);
    setCurrentPage(1);
  }, []);

  const onFilterChange = useCallback(
    (key) => (value) => {
      setFilterValues((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilterValues(emptyFilterValues(filters));
    setCurrentPage(1);
  }, [filters]);

  const hasActiveSearch = debouncedSearch.trim() !== '';
  const hasActiveFilters = Object.values(filterValues).some((v) => v !== '');
  const isFiltered = hasActiveSearch || hasActiveFilters;

  const params = useMemo(() => {
    const query = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };
    if (hasActiveSearch) query.search = debouncedSearch.trim();
    filters.forEach(({ key, paramKey, paramValue }) => {
      const raw = filterValues[key];
      if (!raw) return;
      query[paramKey || key] = paramValue ? paramValue(raw) : raw;
    });
    return query;
  }, [currentPage, pageSize, hasActiveSearch, debouncedSearch, filters, filterValues]);

  const filterConfigs = useMemo(
    () =>
      filters.map((f) => ({
        value: filterValues[f.key],
        onChange: onFilterChange(f.key),
        options: f.options,
        ariaLabel: f.ariaLabel,
      })),
    [filters, filterValues, onFilterChange]
  );

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    searchInput,
    debouncedSearch,
    onSearchChange,
    clearFilters,
    isFiltered,
    params,
    filterConfigs,
  };
};
