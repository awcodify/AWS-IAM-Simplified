'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import UserList from '@/components/UserList';
import PermissionView from '@/components/PermissionView';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import ErrorDisplay from '@/components/ErrorDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRegion } from '@/contexts/RegionContext';
import type { UserPermissions, AccountInfo, IAMUser } from '@/types/aws';

export default function SingleAccountPage() {
  const { awsRegion } = useRegion();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [users, setUsers] = useState<IAMUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awsConnected, setAwsConnected] = useState<boolean | null>(null);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const response = await fetch(`/api/users?region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    const result = await response.json();
    
    if (result.success) {
      setUsers(result.data || []);
    } else {
      setError(result.error || 'Failed to load users');
    }
    setUsersLoading(false);
  }, [awsRegion]);

  const checkAWSConnection = useCallback(async () => {
    const response = await fetch(`/api/account?region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    const result = await response.json();
    
    if (result.success) {
      setAccountInfo(result.data);
      setAwsConnected(true);
      // Load users after successful connection
      loadUsers();
    } else {
      setAwsConnected(false);
      setError(result.error || 'Failed to connect to AWS');
    }
  }, [loadUsers, awsRegion]);

  // Check AWS connection on mount and region change
  useEffect(() => {
    checkAWSConnection();
  }, [checkAWSConnection]);

  const handleUserSelect = async (username: string) => {
    setSelectedUser(username);
    setLoading(true);
    setError(null);
    setUserPermissions(null);

    const response = await fetch(`/api/users/${encodeURIComponent(username)}?region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    const result = await response.json();

    if (result.success) {
      setUserPermissions(result.data);
    } else {
      setError(result.error || 'Failed to fetch user permissions');
    }
    
    setLoading(false);
  };

  return (
    <PageLayout accountInfo={accountInfo}>
      {/* AWS Connection Status */}
      {awsConnected === false && (
        <ErrorDisplay
          title="AWS Connection Failed"
          message="Unable to connect to AWS. Please check your credentials and configuration."
          onRetry={checkAWSConnection}
          retryLabel="Retry Connection"
        >
          <div className="text-xs text-red-600">
            <p><strong>Setup instructions:</strong></p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Configure AWS credentials using <code className="bg-red-100 px-1 rounded">aws configure</code></li>
              <li>Or set environment variables: <code className="bg-red-100 px-1 rounded">AWS_ACCESS_KEY_ID</code>, <code className="bg-red-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code></li>
              <li>Ensure your IAM user has necessary permissions to read IAM resources</li>
            </ol>
          </div>
        </ErrorDisplay>
      )}

      {/* Main Content */}
      {awsConnected === true && (
        <div className="space-y-6">
          {/* Page Header */}
          <PageHeader
            title="IAM Users"
            description="Select a user to view their permissions and accessible resources"
            icon={<Shield className="h-12 w-12 text-blue-600" />}
            actions={
              <button
                onClick={loadUsers}
                disabled={usersLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {usersLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </button>
            }
          >
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                {users.length} Users
              </div>
            </div>
          </PageHeader>
          
          {/* Users List */}
          <div className="bg-white rounded-lg shadow p-6">
            <UserList 
              users={users} 
              onUserSelect={handleUserSelect} 
              loading={usersLoading || loading}
              selectedUser={selectedUser}
            />
          </div>

          {/* Error Display */}
          {error && (
            <ErrorDisplay
              message={error}
              onRetry={loadUsers}
            />
          )}

          {/* Results */}
          {userPermissions && accountInfo && (
            <PermissionView 
              userPermissions={userPermissions} 
              accountId={accountInfo.accountId}
            />
          )}
        </div>
      )}

      {/* Loading State */}
      {awsConnected === null && (
        <LoadingSpinner message="Connecting to AWS..." />
      )}
    </PageLayout>
  );
}
