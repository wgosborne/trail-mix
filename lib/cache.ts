/**
 * Determine storage type based on key.
 * Use localStorage for Strava data (persistent across sessions).
 * Use sessionStorage for other data (session-only).
 */
function getStorageType(key: string): 'localStorage' | 'sessionStorage' {
  if (key.startsWith('strava_')) {
    return 'localStorage';
  }
  return 'sessionStorage';
}

/**
 * Retrieve cached data if available and not expired.
 * Returns null if the item doesn't exist or has expired.
 */
export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = getStorageType(key) === 'localStorage' ? localStorage : sessionStorage;
    const item = storage.getItem(key);
    if (!item) {
      return null;
    }

    const { data, expiresAt } = JSON.parse(item);
    if (Date.now() > expiresAt) {
      storage.removeItem(key);
      return null;
    }

    return data as T;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Store data in cache with optional TTL.
 * Strava data uses localStorage (24 hour TTL) for persistence across sessions.
 * Other data uses sessionStorage (2 minute TTL default) for session-only caching.
 */
export function setCached<T>(
  key: string,
  data: T,
  ttlMs?: number
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Default TTL: 24 hours for Strava, 2 minutes for others
    const defaultTtl = key.startsWith('strava_') ? 24 * 60 * 60 * 1000 : 2 * 60 * 1000;
    const finalTtl = ttlMs ?? defaultTtl;

    const storage = getStorageType(key) === 'localStorage' ? localStorage : sessionStorage;
    const item = {
      data,
      expiresAt: Date.now() + finalTtl,
    };
    storage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Clear a specific cache entry.
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const storage = getStorageType(key) === 'localStorage' ? localStorage : sessionStorage;
    storage.removeItem(key);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}
