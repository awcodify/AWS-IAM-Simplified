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

  const fetchAccountInfo = useCallback(async (region: string): Promise<AccountInfo | null> => {
    // Return cached data if available
    if (accountInfoCache[region]) {
      return accountInfoCache[region];
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
        
        // Cache the result
        accountInfoCache[region] = data;
        
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

  return {
    accountInfo,
    loading,
    error,
    invalidateCache,
    refetch: () => fetchAccountInfo(awsRegion)
  };
}
