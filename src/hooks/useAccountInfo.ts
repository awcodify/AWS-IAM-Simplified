'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRegion } from '@/contexts/RegionContext';
import { createAuthHeaders } from '@/lib/credentials';
import type { AccountInfo } from '@/types/aws';

// Shared cache for account info
let accountInfoCache: { [region: string]: AccountInfo | null } = {};
let accountInfoPromises: { [region: string]: Promise<AccountInfo | null> } = {};

export function useAccountInfo() {
  const { awsRegion } = useRegion();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountInfo = useCallback(async (region: string, skipCache = false): Promise<AccountInfo | null> => {
    // Skip in-memory cache for now to always get fresh data with account names
    // Return existing promise if already fetching
    if (region in accountInfoPromises) {
      return accountInfoPromises[region];
    }

    // Create new fetch promise
    const promise = fetch(`/api/account?region=${encodeURIComponent(region)}`, {
      cache: 'no-cache', // Changed from 'force-cache' to get fresh data
      headers: createAuthHeaders()
    })
      .then(async (response) => {
        const result = await response.json();
        const data = result.success ? result.data : null;
        
        // Don't cache for now to always get fresh account info
        // accountInfoCache[region] = data;
        
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
    return fetchAccountInfo(awsRegion, true);
  }, [awsRegion, fetchAccountInfo, invalidateCache]);

  return {
    accountInfo,
    loading,
    error,
    invalidateCache,
    refetch
  };
}
