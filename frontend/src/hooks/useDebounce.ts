import { useState, useEffect } from 'react';

/**
 * Hook debounces any fast-changing value (e.g. search input keystrokes)
 * Prevents rapid API requests and UI stutter while typing.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
