'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRegion } from '@/contexts/RegionContext';
import { createAuthHeaders } from '@/lib/credentials';
import type { PermissionSetDetails } from '@/types/aws';

// Shared cache for permission sets
let permissionSetsCache: { [key: string]: PermissionSetDetails[] } = {};
let permissionSetsPromises: { [key: string]: Promise<PermissionSetDetails[]> } = {};

export function usePermissionSets() {
  const { awsRegion, ssoRegion } = useRegion();
  const [permissionSets, setPermissionSets] = useState<PermissionSetDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear cache on mount to ensure fresh data
  useEffect(() => {
    permissionSetsCache = {};
    permissionSetsPromises = {};
  }, []);

  const fetchPermissionSets = useCallback(async (region: string, ssoRegionParam: string): Promise<PermissionSetDetails[]> => {
    const cacheKey = `${region}-${ssoRegionParam}`;
    
    // Return cached data if available
    if (permissionSetsCache[cacheKey]) {
      return permissionSetsCache[cacheKey];
    }

    // Return existing promise if already fetching
    if (cacheKey in permissionSetsPromises) {
      return permissionSetsPromises[cacheKey];
    }

    // Create new fetch promise
    const promise = fetch(`/api/permission-sets?region=${encodeURIComponent(region)}&ssoRegion=${encodeURIComponent(ssoRegionParam)}`, {
      cache: 'no-store', // Changed from 'force-cache' to avoid stale data
      headers: createAuthHeaders()
    })
      .then(async (response) => {
        const result = await response.json();
        const data = result.success ? (result.data || []) : [];
        
        // Cache the result
        permissionSetsCache[cacheKey] = data;
        
        // Clear the promise
        delete permissionSetsPromises[cacheKey];
        
        return data;
      })
      .catch((err) => {
        // Clear the promise on error
        delete permissionSetsPromises[cacheKey];
        throw err;
      });

    permissionSetsPromises[cacheKey] = promise;
    return promise;
  }, []);

  useEffect(() => {
    if (!awsRegion || !ssoRegion) {
      setPermissionSets([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetchPermissionSets(awsRegion, ssoRegion)
      .then((data) => {
        setPermissionSets(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch permission sets');
        setLoading(false);
      });
  }, [awsRegion, ssoRegion, fetchPermissionSets]);

  const invalidateCache = useCallback((region?: string, ssoRegionParam?: string) => {
    if (region && ssoRegionParam) {
      const cacheKey = `${region}-${ssoRegionParam}`;
      delete permissionSetsCache[cacheKey];
      delete permissionSetsPromises[cacheKey];
    } else {
      permissionSetsCache = {};
      permissionSetsPromises = {};
    }
  }, []);

  return {
    permissionSets,
    loading,
    error,
    invalidateCache,
    refetch: () => fetchPermissionSets(awsRegion, ssoRegion)
  };
}
