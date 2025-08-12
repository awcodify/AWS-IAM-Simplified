'use client';

import { Building2, Users, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import UserAccessTable from '@/components/UserAccessTable';
import ErrorDisplay from '@/components/ErrorDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRegion } from '@/contexts/RegionContext';
import { useState, useEffect, useCallback } from 'react';
import type { AccountInfo, OrganizationUser, OrganizationAccount } from '@/types/aws';

export default function OrganizationPage() {
  const { awsRegion, ssoRegion } = useRegion();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [accounts, setAccounts] = useState<OrganizationAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loadingUserAccess, setLoadingUserAccess] = useState<string | null>(null);
  const [loadingBulkAccess, setLoadingBulkAccess] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const checkAWSConnection = useCallback(async () => {
    const response = await fetch(`/api/account?region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    const result = await response.json();
    
    if (result.success) {
      setAccountInfo(result.data);
    }
  }, [awsRegion]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsers([]);
    setAccounts([]);
    setSelectedUser(null);

    // Fetch accounts and users in parallel
    const accountsPromise = fetch(`/api/organization/accounts?region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    const usersPromise = fetch(`/api/organization/users?ssoRegion=${encodeURIComponent(ssoRegion)}&region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    
    Promise.all([accountsPromise, usersPromise])
      .then(async ([accountsResponse, usersResponse]) => {
        const accountsData = await accountsResponse.json();
        const usersData = await usersResponse.json();

        if (!accountsData.success) {
          setError(accountsData.error || 'Failed to fetch organization accounts');
          return;
        }

        if (!usersData.success) {
          setError(usersData.error || 'Failed to fetch organization users');
          return;
        }

        setAccounts(accountsData.data || []);
        setUsers(usersData.data || []);
        setIsInitialLoad(false);
      })
      .catch(error => {
        setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ssoRegion, awsRegion]);

  const loadAllUsersAccess = async () => {
    if (users.length === 0) return;
    
    setLoadingBulkAccess(true);
    
    const userIds = users.map(user => user.user.UserId);
    
    fetch('/api/organization/users/bulk-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        ssoRegion: encodeURIComponent(ssoRegion),
        region: encodeURIComponent(awsRegion)
      }),
      cache: 'no-store'
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          // Update all users' account access
          setUsers(prevUsers => 
            prevUsers.map(user => ({
              ...user,
              accountAccess: result.data[user.user.UserId] || []
            }))
          );
        } else {
          console.error('Failed to load bulk user access:', result.error);
        }
      })
      .catch(error => {
        console.error('Error loading bulk user access:', error);
      })
      .finally(() => {
        setLoadingBulkAccess(false);
      });
  };

  const handleUserClick = async (orgUser: OrganizationUser) => {
    const userId = orgUser.user.UserId;
    
    if (selectedUser === userId) {
      // Collapse if already selected
      setSelectedUser(null);
      return;
    }

    setSelectedUser(userId);

    // If account access is already loaded, don't fetch again
    if (orgUser.accountAccess.length > 0) {
      return;
    }

    // Load account access on demand using the new efficient API
    setLoadingUserAccess(userId);
    
    fetch(`/api/organization/users/${encodeURIComponent(userId)}?ssoRegion=${encodeURIComponent(ssoRegion)}&region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          // Update the user's account access in the state
          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.user.UserId === userId 
                ? { ...user, accountAccess: result.data || [] }
                : user
            )
          );
        } else {
          console.error('Failed to load user account access:', result.error);
        }
      })
      .catch(error => {
        console.error('Error loading user account access:', error);
      })
      .finally(() => {
        setLoadingUserAccess(null);
      });
  };

  // Automatically fetch data on mount and region changes
  useEffect(() => {
    checkAWSConnection();
    fetchData();
  }, [checkAWSConnection, fetchData]);

  if (isInitialLoad && loading) {
    return (
      <PageLayout accountInfo={accountInfo}>
        <LoadingSpinner message="Loading organization data..." />
      </PageLayout>
    );
  }

  if (error && isInitialLoad) {
    return (
      <PageLayout accountInfo={accountInfo}>
        <ErrorDisplay
          title="Failed to Load Organization Data"
          message={error}
          onRetry={fetchData}
          retryLabel="Retry Loading"
        />
      </PageLayout>
    );
  }

  const actions = (
    <>
      <button
        onClick={loadAllUsersAccess}
        disabled={loadingBulkAccess || users.length === 0}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingBulkAccess ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading All Access...
          </>
        ) : (
          <>
            <Users className="w-4 h-4 mr-2" />
            Load All Access
          </>
        )}
      </button>
      
      <button
        onClick={fetchData}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </>
        )}
      </button>
    </>
  );

  return (
    <PageLayout accountInfo={accountInfo}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Organization Users"
          description="View which users have access to which accounts in your organization"
          icon={<Building2 className="h-12 w-12 text-blue-600" />}
          actions={actions}
        >
          {/* Help text for region selectors - Only show if different */}
          {ssoRegion !== awsRegion && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <strong>Region Configuration:</strong> Your AWS region ({awsRegion}) and IAM Identity Center region ({ssoRegion}) are different. 
                  The Identity Center region is configured via environment variables.
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {users.length} Users
            </div>
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              {accounts.length} Accounts
            </div>
            <div className="text-xs text-gray-400">
              💡 Use &quot;Load All Access&quot; for efficient bulk loading
            </div>
          </div>
          
          {users.length > 0 && users[0]?.user?.IdentityStoreId && !users[0].user.IdentityStoreId.startsWith('d-') && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> IAM Identity Center is not available, showing IAM users across organization accounts instead.
              </div>
            </div>
          )}
        </PageHeader>

        {/* Error Display for non-initial errors */}
        {error && !isInitialLoad && (
          <ErrorDisplay
            message={error}
            onRetry={fetchData}
          />
        )}

        {/* User Access Table */}
        <UserAccessTable
          users={users}
          onUserClick={handleUserClick}
          selectedUser={selectedUser || undefined}
          loadingUserAccess={loadingUserAccess}
        />

        {users.length === 0 && !loading && (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600 mb-4">
              No users found in your organization accounts.
            </p>
            <div className="text-sm text-gray-500 space-y-2">
              <p>This could mean:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>IAM Identity Center is not enabled</li>
                <li>No IAM users exist in the organization accounts you have access to</li>
                <li>You may not have sufficient permissions to list users</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
