/**
 * Retrieve cached data from sessionStorage if available and not expired.
 * Returns null if the item doesn't exist or has expired.
 */
export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const item = sessionStorage.getItem(key);
    if (!item) {
      return null;
    }

    const { data, expiresAt } = JSON.parse(item);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }

    return data as T;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Store data in sessionStorage with optional TTL (default: 2 minutes).
 * Data will be automatically expired based on the ttlMs parameter.
 */
export function setCached<T>(key: string, data: T, ttlMs: number = 2 * 60 * 1000): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const item = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    sessionStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
