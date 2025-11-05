import { useEffect, useRef, useCallback } from "react";

/**
 * A hook that returns a debounced version of the provided function
 * @param fn The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the function
 */
export function useDebounce<
  T extends (...args: Parameters<T>) => ReturnType<T>,
>(fn: T, delay: number): (...args: Parameters<T>) => void {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fnRef = useRef(fn);

  // Update ref without causing re-renders
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay], // Only depend on delay, not fn
  );
}
