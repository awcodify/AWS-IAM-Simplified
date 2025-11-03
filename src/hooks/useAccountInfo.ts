'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRegion } from '@/contexts/RegionContext';
import { createAuthHeaders } from '@/lib/credentials';
import type { AccountInfo } from '@/types/aws';
import { ACCOUNT_INFO_CACHE_TTL } from '@/constants/api';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = ACCOUNT_INFO_CACHE_TTL;

// Shared cache for account info with timestamps
interface CacheEntry {
  data: AccountInfo | null;
  timestamp: number;
}

let accountInfoCache: { [region: string]: CacheEntry } = {};
let accountInfoPromises: { [region: string]: Promise<AccountInfo | null> } = {};

export function useAccountInfo() {
  const { awsRegion } = useRegion();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountInfo = useCallback(async (region: string): Promise<AccountInfo | null> => {
    // Check if we have a valid cached entry
    const cachedEntry = accountInfoCache[region];
    const now = Date.now();
    
    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_TTL) {
      // Return cached data if still fresh
      return cachedEntry.data;
    }

    // Return existing promise if already fetching
    if (region in accountInfoPromises) {
      return accountInfoPromises[region];
    }

    // Create new fetch promise
    const promise = fetch(`/api/account?region=${encodeURIComponent(region)}`, {
      cache: 'force-cache',
      headers: createAuthHeaders()
    })
      .then(async (response) => {
        const result = await response.json();
        const data = result.success ? result.data : null;
        
        // Cache the result with timestamp
        accountInfoCache[region] = {
          data,
          timestamp: Date.now()
        };
        
        // Clear the promise
        delete accountInfoPromises[region];
        
        return data;
      })
      .catch((err) => {
        // Clear the promise on error
        delete accountInfoPromises[region];
        throw err;
      });

    accountInfoPromises[region] = promise;
    return promise;
  }, []);

  useEffect(() => {
    if (!awsRegion) return;

    setLoading(true);
    setError(null);

    fetchAccountInfo(awsRegion)
      .then((data) => {
        setAccountInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch account info');
        setLoading(false);
      });
  }, [awsRegion, fetchAccountInfo]);

  const invalidateCache = useCallback((region?: string) => {
    if (region) {
      delete accountInfoCache[region];
      delete accountInfoPromises[region];
    } else {
      accountInfoCache = {};
      accountInfoPromises = {};
    }
  }, []);

  const refetch = useCallback(() => {
    invalidateCache(awsRegion);
    return fetchAccountInfo(awsRegion);
  }, [awsRegion, fetchAccountInfo, invalidateCache]);

  return {
    accountInfo,
    loading,
    error,
    invalidateCache,
    refetch
  };
}
