'use client';

import { useRegion } from '@/contexts/RegionContext';
import { createAuthHeaders } from '@/lib/credentials';
import type { PermissionSetDetails } from '@/types/aws';
import { useCachedData } from './useCachedData';

export function usePermissionSets() {
  const { awsRegion, identityCenterRegion } = useRegion();

  const cacheKey = `${awsRegion}-${identityCenterRegion}`;
  const enabled = !!(awsRegion && identityCenterRegion);

  const { data, loading, error, invalidate, refetch } = useCachedData<PermissionSetDetails[]>({
    cacheKey,
    fetcher: async () => {
      const response = await fetch(
        `/api/permission-sets?region=${encodeURIComponent(awsRegion)}&ssoRegion=${encodeURIComponent(identityCenterRegion)}`,
        {
          cache: 'no-store',
          headers: createAuthHeaders()
        }
      );
      const result = await response.json();
      return result.success ? (result.data || []) : [];
    },
    namespace: 'permissionSets',
    enabled,
    initialData: [],
  });

  return {
    permissionSets: data || [],
    loading,
    error,
    invalidateCache: invalidate,
    refetch
  };
}
