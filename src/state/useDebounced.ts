import { useEffect, useState } from 'react';

/** `value`, but only after it stopped changing for `ms`. An emptied string applies at once (clearing search). */
export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return value === '' ? value : v;
}
