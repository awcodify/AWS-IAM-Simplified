'use client';

import { useRegion } from '@/contexts/RegionContext';
import { createAuthHeaders } from '@/lib/credentials';
import type { OrganizationAccount } from '@/types/aws';
import { useCachedData } from './useCachedData';

export function useOrganizationAccounts() {
  const { awsRegion } = useRegion();

  const { data, loading, error, invalidate, refetch } = useCachedData<OrganizationAccount[]>({
    cacheKey: `org-accounts-${awsRegion}`,
    fetcher: async () => {
      const response = await fetch(
        `/api/organization/accounts?region=${encodeURIComponent(awsRegion)}`,
        {
          method: 'GET',
          headers: createAuthHeaders(),
          cache: 'no-store'
        }
      );
      const result = await response.json();
      return result.success ? (result.data || []) : [];
    },
    namespace: 'organizationAccounts',
    enabled: !!awsRegion,
    initialData: [],
  });

  return {
    accounts: data || [],
    loading,
    error,
    invalidateCache: invalidate,
    refetch
  };
}
