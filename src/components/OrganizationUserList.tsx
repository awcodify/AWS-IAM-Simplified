'use client';

import { useState } from 'react';
import { Users, Building2, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import RegionSelector from './RegionSelector';
import type { OrganizationUser, OrganizationAccount } from '@/types/aws';

export default function OrganizationUserList() {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [accounts, setAccounts] = useState<OrganizationAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loadingUserAccess, setLoadingUserAccess] = useState<string | null>(null);
  const [awsRegion, setAwsRegion] = useState<string>(
    process.env.NEXT_PUBLIC_AWS_DEFAULT_REGION || 'us-east-1'
  );
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);

  // Get SSO region from environment variables
  const ssoRegion = process.env.NEXT_PUBLIC_AWS_SSO_REGION || 'us-east-1';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setUsers([]);
    setAccounts([]);
    setSelectedUser(null);

    try {
      // Fetch accounts and users in parallel
      const accountsPromise = fetch(`/api/organization/accounts?region=${encodeURIComponent(awsRegion)}`);
      const usersPromise = fetch(`/api/organization/users?ssoRegion=${encodeURIComponent(ssoRegion)}&region=${encodeURIComponent(awsRegion)}`);
      
      const [accountsResponse, usersResponse] = await Promise.all([accountsPromise, usersPromise]);

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
    } catch (error) {
      setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Remove the automatic fetch on mount and region changes
  // useEffect(() => {
  //   fetchData();
  // }, [ssoRegion, awsRegion]);

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

    // Load account access on demand
    setLoadingUserAccess(userId);
    
    try {
      const response = await fetch(`/api/organization/users/${encodeURIComponent(userId)}?ssoRegion=${encodeURIComponent(ssoRegion)}&region=${encodeURIComponent(awsRegion)}`);
      const result = await response.json();
      
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
    } catch (error) {
      console.error('Error loading user account access:', error);
    } finally {
      setLoadingUserAccess(null);
    }
  };

  const getAccessStatusIcon = (hasAccess: boolean) => {
    return hasAccess ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getAccessTypeColor = (accessType?: string) => {
    switch (accessType) {
      case 'IAM':
        return 'bg-blue-100 text-blue-800';
      case 'SSO':
        return 'bg-green-100 text-green-800';
      case 'AssumedRole':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasDataBeenFetched && !loading) {
    return (
      <div className="space-y-6">
        {/* Header with Region Selectors */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between mb-6">
            <div className="mb-4 xl:mb-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Users</h2>
              <p className="text-gray-600">
                Select your regions and fetch organization data to view user access across accounts
              </p>
            </div>
            
            {/* Region Selectors */}
            <div className="flex flex-col sm:flex-row gap-4 min-w-0 xl:min-w-96">
              {/* AWS Region Selector */}
              <RegionSelector
                label="AWS Region"
                value={awsRegion}
                onChange={setAwsRegion}
                disabled={loading}
                icon={<Building2 className="w-4 h-4 text-green-600 mr-2" />}
                description="Primary AWS region for operations"
                colorScheme="green"
                className="flex-1"
              />
            </div>
          </div>

          {/* Region Information */}
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
          <div className="text-center">
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

          {/* Current Region Selection */}
          <div className="mt-4 flex justify-center items-center space-x-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
              AWS: {awsRegion}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
              SSO: {ssoRegion} (env)
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <h3 className="text-red-800 font-medium">Error</h3>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading organization data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <h3 className="text-red-800 font-medium">Error</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between mb-6">
            <div className="mb-4 xl:mb-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Users</h2>
              <p className="text-gray-600">
                View which users have access to which accounts in your organization
              </p>
            </div>
            
            {/* Region Selectors and Refresh Button */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 min-w-0 xl:min-w-96">
                {/* AWS Region Selector */}
                <RegionSelector
                  label="AWS Region"
                  value={awsRegion}
                  onChange={setAwsRegion}
                  disabled={loading}
                  icon={<Building2 className="w-4 h-4 text-green-600 mr-2" />}
                  description="Primary AWS region for operations"
                  colorScheme="green"
                  className="flex-1"
                />
              </div>
              
              {/* Refresh Button */}
              <div className="flex justify-center">
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
          </div>        {/* Help text for region selectors */}
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
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
              AWS: {awsRegion}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
              SSO: {ssoRegion} (env)
            </span>
          </div>
        </div>
        
        {users.length > 0 && users[0]?.user?.IdentityStoreId && !users[0].user.IdentityStoreId.startsWith('d-') && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> IAM Identity Center is not available, showing IAM users across organization accounts instead.
            </p>
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
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                AWS: {awsRegion}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                ssoRegion === awsRegion 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              }`}>
                SSO: {ssoRegion}
              </span>
              {ssoRegion !== awsRegion && (
                <span className="text-xs text-yellow-600 font-medium">
                  ⚠️ Different regions
                </span>
              )}
            </div>
          </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {users.map((orgUser) => (
            <div key={orgUser.user.UserId} className="p-6">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleUserClick(orgUser)}
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {orgUser.user.DisplayName || orgUser.user.UserName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {orgUser.user.UserName}
                    </p>
                    {orgUser.user.Emails.length > 0 && (
                      <p className="text-sm text-gray-400">
                        {orgUser.user.Emails[0].Value}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Home Account: {orgUser.homeAccountId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {loadingUserAccess === orgUser.user.UserId ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : orgUser.accountAccess.length > 0 ? (
                    <span className="text-sm text-gray-500">
                      {orgUser.accountAccess.filter(a => a.hasAccess).length} / {orgUser.accountAccess.length} accounts
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Click to load access info
                    </span>
                  )}
                  <svg 
                    className={`w-5 h-5 transform transition-transform ${selectedUser === orgUser.user.UserId ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {selectedUser === orgUser.user.UserId && (
                <div className="mt-4 pl-12">
                  {loadingUserAccess === orgUser.user.UserId ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2 text-gray-600">Loading account access...</span>
                    </div>
                  ) : orgUser.accountAccess.length > 0 ? (
                    <>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Account Access</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {orgUser.accountAccess.map((access) => (
                          <div 
                            key={access.accountId}
                            className="border rounded-lg p-3 bg-gray-50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {access.accountName || access.accountId}
                              </span>
                              {getAccessStatusIcon(access.hasAccess)}
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              ID: {access.accountId}
                            </div>
                            {access.hasAccess && access.accessType && (
                              <div className="mb-2">
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getAccessTypeColor(access.accessType)}`}>
                                  {access.accessType}
                                </span>
                              </div>
                            )}
                            {access.hasAccess && access.roles && access.roles.length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs text-gray-600 mb-1">Permission Sets:</div>
                                {access.roles.map((role, index) => (
                                  <div key={index} className="text-xs text-blue-600 truncate">
                                    {role.split('/').pop() || role}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-2">
                              Checked: {new Date(access.lastChecked).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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
