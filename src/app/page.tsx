'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import UserList from '@/components/UserList';
import PermissionView from '@/components/PermissionView';
import type { UserPermissions, AccountInfo, IAMUser } from '@/types/aws';

export default function Home() {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [users, setUsers] = useState<IAMUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awsConnected, setAwsConnected] = useState<boolean | null>(null);

  // Check AWS connection on mount
  useEffect(() => {
    checkAWSConnection();
  }, []);

  const checkAWSConnection = async () => {
    const response = await fetch('/api/account');
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
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    const response = await fetch('/api/users');
    const result = await response.json();
    
    if (result.success) {
      setUsers(result.data || []);
    } else {
      setError(result.error || 'Failed to load users');
    }
    setUsersLoading(false);
  };

  const handleUserSelect = async (username: string) => {
    setSelectedUser(username);
    setLoading(true);
    setError(null);
    setUserPermissions(null);

    const response = await fetch(`/api/users/${encodeURIComponent(username)}`);
    const result = await response.json();

    if (result.success) {
      setUserPermissions(result.data);
    } else {
      setError(result.error || 'Failed to fetch user permissions');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AWS IAM Dashboard</h1>
              <p className="text-gray-600 mt-1">Simplified IAM management and permission tracking</p>
            </div>
            {accountInfo && (
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                Account: {accountInfo.accountId}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AWS Connection Status */}
        {awsConnected === false && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">AWS Connection Failed</h3>
                <p className="text-sm text-red-700 mt-1">
                  Unable to connect to AWS. Please check your credentials and configuration.
                </p>
                <div className="mt-3 text-xs text-red-600">
                  <p><strong>Setup instructions:</strong></p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Configure AWS credentials using <code className="bg-red-100 px-1 rounded">aws configure</code></li>
                    <li>Or set environment variables: <code className="bg-red-100 px-1 rounded">AWS_ACCESS_KEY_ID</code>, <code className="bg-red-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code></li>
                    <li>Ensure your IAM user has necessary permissions to read IAM resources</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {awsConnected === true && (
          <div className="space-y-8">
            {/* Users List Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center mb-6">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-gray-900">IAM Users</h2>
                <p className="text-gray-600 mt-1">
                  Select a user to see what resources they can access
                </p>
              </div>
              
              <UserList 
                users={users} 
                onUserSelect={handleUserSelect} 
                loading={usersLoading}
                selectedUser={selectedUser}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
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
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-3">Connecting to AWS...</p>
          </div>
        )}
      </div>
    </div>
  );
}
