'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Shield, CheckCircle2, Building2 } from 'lucide-react';
import UserList from '@/components/UserList';
import PermissionView from '@/components/PermissionView';
import OrganizationUserList from '@/components/OrganizationUserList';
import AWSConfigDiagnostic from '@/components/AWSConfigDiagnostic';
import Header from '@/components/Header';
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
  const [activeTab, setActiveTab] = useState<'single' | 'organization' | 'diagnostic'>('single');

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const response = await fetch('/api/users');
    const result = await response.json();
    
    if (result.success) {
      setUsers(result.data || []);
    } else {
      setError(result.error || 'Failed to load users');
    }
    setUsersLoading(false);
  }, []);

  const checkAWSConnection = useCallback(async () => {
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
  }, [loadUsers]);

  // Check AWS connection on mount
  useEffect(() => {
    checkAWSConnection();
  }, [checkAWSConnection]);

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
      <Header accountInfo={accountInfo} />

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
            {/* Tab Navigation */}
            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'single'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Single Account View
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('organization')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'organization'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      Organization View
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('diagnostic')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'diagnostic'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Diagnostics
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'single' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                      <h2 className="text-xl font-semibold text-gray-900">IAM Users</h2>
                      <p className="text-gray-600 mt-1">
                        Select a user to see what resources they can access
                      </p>
                    </div>
                    
                    <UserList 
                      users={users} 
                      onUserSelect={handleUserSelect} 
                      loading={usersLoading || loading}
                      selectedUser={selectedUser}
                    />
                  </div>
                )}

                {activeTab === 'organization' && (
                  <OrganizationUserList />
                )}

                {activeTab === 'diagnostic' && (
                  <AWSConfigDiagnostic />
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && activeTab === 'single' && (
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
            {userPermissions && accountInfo && activeTab === 'single' && (
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
