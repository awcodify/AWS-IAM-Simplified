import { useState, useEffect, useCallback } from 'react';
import { createAuthHeaders } from '@/lib/credentials';
import type { UserPermissions } from '@/types/aws';

interface UseIAMUserPermissionsResult {
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch IAM user permissions (policies and groups)
 */
export function useIAMUserPermissions(
  userName: string | null, 
  region: string
): UseIAMUserPermissionsResult {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!userName) {
      setPermissions(null);
      return;
    }

    setLoading(true);
    setError(null);

    const encodedUserName = encodeURIComponent(userName);
    const response = await fetch(
      `/api/iam/users/${encodedUserName}/permissions?region=${region}`,
      {
        method: 'GET',
        headers: createAuthHeaders(),
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      setError(errorData.error || 'Failed to fetch user permissions');
      setLoading(false);
      return;
    }

    const data = await response.json();
    setPermissions(data.permissions);
    setLoading(false);
  }, [userName, region]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    error,
    refetch: fetchPermissions
  };
}
