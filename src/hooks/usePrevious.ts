import { useEffect, useRef } from "react";

/**
 * Returns the value from the previous committed render (`undefined` on the
 * first). Safe in StrictMode and concurrent rendering because the ref is only
 * written after commit.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
