/**
 * Request deduplication utility to prevent duplicate API calls
 * when multiple users or components request the same data simultaneously.
 */

const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Wraps a fetch function with deduplication logic.
 * If a request with the same key is already in-flight, returns the existing promise.
 * Otherwise, executes the fetch function and caches the promise until it resolves.
 *
 * @param key - Unique identifier for the request
 * @param fetchFn - Function that performs the actual fetch operation
 * @returns Promise with the fetched data
 *
 * @example
 * const data = await deduplicatedFetch(
 *   `ai:${playgroundId}`,
 *   () => fetchFromAPI(playgroundId)
 * );
 */
export async function deduplicatedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check if request is already in-flight
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }

  // Create new request and cache it
  const promise = fetchFn().finally(() => {
    // Clean up after request completes (success or failure)
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}
