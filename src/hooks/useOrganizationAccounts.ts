'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRegion } from '@/contexts/RegionContext';
import type { OrganizationAccount } from '@/types/aws';

// Shared cache for organization accounts
let organizationAccountsCache: { [region: string]: OrganizationAccount[] } = {};
let organizationAccountsPromises: { [region: string]: Promise<OrganizationAccount[]> } = {};

export function useOrganizationAccounts() {
  const { awsRegion } = useRegion();
  const [accounts, setAccounts] = useState<OrganizationAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizationAccounts = useCallback(async (region: string): Promise<OrganizationAccount[]> => {
    // Return cached data if available
    if (organizationAccountsCache[region]) {
      return organizationAccountsCache[region];
    }

    // Return existing promise if already fetching
    if (region in organizationAccountsPromises) {
      return organizationAccountsPromises[region];
    }

    // Create new fetch promise
    const promise = fetch(`/api/organization/accounts?region=${encodeURIComponent(region)}`, {
      cache: 'force-cache'
    })
      .then(async (response) => {
        const result = await response.json();
        const data = result.success ? (result.data || []) : [];
        
        // Cache the result
        organizationAccountsCache[region] = data;
        
        // Clear the promise
        delete organizationAccountsPromises[region];
        
        return data;
      })
      .catch((err) => {
        // Clear the promise on error
        delete organizationAccountsPromises[region];
        throw err;
      });

    organizationAccountsPromises[region] = promise;
    return promise;
  }, []);

  useEffect(() => {
    if (!awsRegion) {
      setAccounts([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetchOrganizationAccounts(awsRegion)
      .then((data) => {
        setAccounts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch organization accounts');
        setLoading(false);
      });
  }, [awsRegion, fetchOrganizationAccounts]);

  const invalidateCache = useCallback((region?: string) => {
    if (region) {
      delete organizationAccountsCache[region];
      delete organizationAccountsPromises[region];
    } else {
      organizationAccountsCache = {};
      organizationAccountsPromises = {};
    }
  }, []);

  return {
    accounts,
    loading,
    error,
    invalidateCache,
    refetch: () => fetchOrganizationAccounts(awsRegion)
  };
}
