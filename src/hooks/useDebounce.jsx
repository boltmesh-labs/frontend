import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce any value.
 * @param {*} value - Value to debounce.
 * @param {number} delay - Debounce delay in ms.
 * @returns {*} Debounced value.
 */
export const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
