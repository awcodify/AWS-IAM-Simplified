/**
 * Generic cache hook for data fetching with TTL support
 * 
 * Features:
 * - TTL-based caching (optional, permanent cache if not specified)
 * - Promise deduplication (prevents duplicate concurrent requests)
 * - Region/key-based caching
 * - Type-safe with TypeScript generics
 * - Manual cache invalidation
 * 
 * @example
 * ```typescript
 * const { data, loading, error, invalidate } = useCachedData({
 *   cacheKey: `account-${region}`,
 *   fetcher: () => fetchAccountInfo(region),
 *   ttl: 5 * 60 * 1000 // 5 minutes
 * });
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheStore<T> {
  entries: Map<string, CacheEntry<T>>;
  promises: Map<string, Promise<T>>;
}

// Global cache store for all useCachedData instances
const globalCache = new Map<string, CacheStore<any>>();

function getCacheStore<T>(namespace: string): CacheStore<T> {
  if (!globalCache.has(namespace)) {
    globalCache.set(namespace, {
      entries: new Map(),
      promises: new Map(),
    });
  }
  return globalCache.get(namespace)!;
}

interface UseCachedDataOptions<T> {
  /**
   * Unique key for this cached data
   * Can include region, filters, etc.
   */
  cacheKey: string;
  
  /**
   * Function that fetches the data
   * Will only be called if cache is expired or missing
   */
  fetcher: () => Promise<T>;
  
  /**
   * Time-to-live in milliseconds
   * If undefined, cache never expires
   */
  ttl?: number;
  
  /**
   * Namespace for the cache (optional)
   * Allows different data types to have separate caches
   * @default 'default'
   */
  namespace?: string;
  
  /**
   * Enable/disable the hook
   * Useful for conditional fetching
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Initial data value
   * @default null
   */
  initialData?: T | null;
}

interface UseCachedDataResult<T> {
  /**
   * Cached or fetched data
   */
  data: T | null;
  
  /**
   * Loading state
   */
  loading: boolean;
  
  /**
   * Error message if fetch failed
   */
  error: string | null;
  
  /**
   * Manually invalidate the cache for this key
   */
  invalidate: () => void;
  
  /**
   * Manually invalidate all cache entries in this namespace
   */
  invalidateAll: () => void;
  
  /**
   * Manually refetch the data (bypasses cache)
   */
  refetch: () => Promise<void>;
}

/**
 * Generic hook for cached data fetching
 */
export function useCachedData<T>(
  options: UseCachedDataOptions<T>
): UseCachedDataResult<T> {
  const {
    cacheKey,
    fetcher,
    ttl,
    namespace = 'default',
    enabled = true,
    initialData = null,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to avoid recreating fetchData function on every render
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  /**
   * Invalidate cache for specific key
   */
  const invalidate = useCallback(() => {
    const store = getCacheStore<T>(namespace);
    store.entries.delete(cacheKey);
    store.promises.delete(cacheKey);
  }, [namespace, cacheKey]);

  /**
   * Invalidate all cache entries in namespace
   */
  const invalidateAll = useCallback(() => {
    const store = getCacheStore<T>(namespace);
    store.entries.clear();
    store.promises.clear();
  }, [namespace]);

  /**
   * Check if cached entry is still valid
   */
  const isCacheValid = useCallback((entry: CacheEntry<T>): boolean => {
    if (!ttl) {
      // No TTL means cache never expires
      return true;
    }
    
    const now = Date.now();
    return (now - entry.timestamp) < ttl;
  }, [ttl]);

  /**
   * Fetch data with caching and deduplication
   */
  const fetchData = useCallback(async (bypassCache = false): Promise<T> => {
    const store = getCacheStore<T>(namespace);

    // Check cache first (unless bypassing)
    if (!bypassCache) {
      const cachedEntry = store.entries.get(cacheKey);
      if (cachedEntry && isCacheValid(cachedEntry)) {
        return cachedEntry.data;
      }
      
      // Return existing promise if already fetching (deduplication)
      if (store.promises.has(cacheKey)) {
        return store.promises.get(cacheKey)!;
      }
    }

    // Create new fetch promise
    const promise = fetcherRef.current()
      .then((fetchedData) => {
        // Cache the result with timestamp
        store.entries.set(cacheKey, {
          data: fetchedData,
          timestamp: Date.now(),
        });
        
        // Clear the promise
        store.promises.delete(cacheKey);
        
        return fetchedData;
      })
      .catch((err) => {
        // Clear the promise on error
        store.promises.delete(cacheKey);
        throw err;
      });

    // Store promise for deduplication
    store.promises.set(cacheKey, promise);
    
    return promise;
  }, [namespace, cacheKey, isCacheValid]);

  /**
   * Manual refetch (bypasses cache)
   */
  const refetch = useCallback(async () => {
    if (!enabled) return;
    
    const store = getCacheStore<T>(namespace);
    
    // Clear cache and promises for this key
    store.entries.delete(cacheKey);
    store.promises.delete(cacheKey);
    
    setLoading(true);
    setError(null);

    try {
      const fetchedData = await fetchData(true);
      setData(fetchedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('useCachedData refetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchData, namespace, cacheKey]);

  /**
   * Effect to fetch data when dependencies change
   */
  useEffect(() => {
    if (!enabled) {
      setData(initialData);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedData = await fetchData();
        
        if (isMounted) {
          setData(fetchedData);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
          setError(errorMessage);
          console.error('useCachedData fetch error:', errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, enabled, fetchData, initialData]);

  return {
    data,
    loading,
    error,
    invalidate,
    invalidateAll,
    refetch,
  };
}

/**
 * Utility to create a typed cache hook for specific data types
 * 
 * @example
 * ```typescript
 * export const useAccountCache = createCachedHook<AccountInfo>('accounts');
 * 
 * // Usage:
 * const { data } = useAccountCache({
 *   cacheKey: `account-${region}`,
 *   fetcher: () => fetchAccount(region)
 * });
 * ```
 */
export function createCachedHook<T>(namespace: string) {
  return (
    options: Omit<UseCachedDataOptions<T>, 'namespace'>
  ): UseCachedDataResult<T> => {
    return useCachedData({ ...options, namespace });
  };
}
