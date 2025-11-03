'use client';

import { useRegion } from '@/contexts/RegionContext';
import { createAuthHeaders } from '@/lib/credentials';
import type { AccountInfo } from '@/types/aws';
import { ACCOUNT_INFO_CACHE_TTL } from '@/constants/api';
import { useCachedData } from './useCachedData';

export function useAccountInfo() {
  const { awsRegion } = useRegion();

  const { data, loading, error, invalidate, invalidateAll, refetch } = useCachedData<AccountInfo>({
    cacheKey: `account-${awsRegion}`,
    fetcher: async () => {
      const response = await fetch(`/api/account?region=${encodeURIComponent(awsRegion)}`, {
        cache: 'force-cache',
        headers: createAuthHeaders()
      });
      const result = await response.json();
      return result.success ? result.data : null;
    },
    ttl: ACCOUNT_INFO_CACHE_TTL,
    namespace: 'accountInfo',
    enabled: !!awsRegion,
  });

  return {
    accountInfo: data,
    loading,
    error,
    invalidateCache: invalidate,
    invalidateAll,
    refetch
  };
}
