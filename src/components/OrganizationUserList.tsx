'use client';

import { useState } from 'react';
import { Users, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';
import UserListContainer from './UserListContainer';
import ErrorDisplay from './ErrorDisplay';
import LoadingSpinner from './LoadingSpinner';
import type { OrganizationUser, OrganizationAccount } from '@/types/aws';

export default function OrganizationUserList() {
  const { awsRegion, ssoRegion } = useRegion();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [accounts, setAccounts] = useState<OrganizationAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loadingUserAccess, setLoadingUserAccess] = useState<string | null>(null);
  const [loadingBulkAccess, setLoadingBulkAccess] = useState(false);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);

  const fetchData = async () => {
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
        setHasDataBeenFetched(true);
      })
      .catch(error => {
        setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Remove the automatic fetch on mount and region changes
  // useEffect(() => {
  //   fetchData();
  // }, [ssoRegion, awsRegion]);

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

  if (!hasDataBeenFetched && !loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Users</h2>
            
            {/* Region Information - Only show if different */}
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

            {/* Fetch Data Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Fetching Data...
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5 mr-2" />
                  Fetch Organization Data
                </>
              )}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Click to load users and accounts from your AWS Organization
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            message={error}
            onRetry={fetchData}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading organization data..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Users</h2>
              <p className="text-gray-600">
                View which users have access to which accounts in your organization
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 lg:mt-0 flex gap-2">
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
                    <Building2 className="w-4 h-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </button>
            </div>
          </div>
        
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
            💡 Use "Load All Access" for efficient bulk loading
          </div>
        </div>
        
        {users.length > 0 && users[0]?.user?.IdentityStoreId && !users[0].user.IdentityStoreId.startsWith('d-') && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> IAM Identity Center is not available, showing IAM users across organization accounts instead.
            </p>
          </div>
        )}
      </div>

      {/* Users List */}
      <UserListContainer
        variant="organization"
        users={users}
        onUserClick={handleUserClick}
        selectedUser={selectedUser || undefined}
        loadingUserAccess={loadingUserAccess}
      />

      {users.length === 0 && (
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
  );
}
