import { useState, useEffect, useCallback } from 'react';
import { createAuthHeaders } from '@/lib/credentials';
import type { OrganizationUser } from '@/types/aws';

interface IAMUsersResponse {
  users: OrganizationUser[];
  accountId: string;
  count: number;
  timestamp: string;
}

interface UseIAMUsersResult {
  users: OrganizationUser[];
  loading: boolean;
  error: string | null;
  accountId: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch IAM users from the current account
 */
export function useIAMUsers(region: string): UseIAMUsersResult {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/iam/users?region=${region}`, {
      method: 'GET',
      headers: createAuthHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json();
      setError(errorData.error || 'Failed to fetch IAM users');
      setLoading(false);
      return;
    }

    const data: IAMUsersResponse = await response.json();
    setUsers(data.users);
    setAccountId(data.accountId);
    setLoading(false);
  }, [region]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    accountId,
    refetch: fetchUsers
  };
}
