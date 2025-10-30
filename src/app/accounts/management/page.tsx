'use client';

import { Building2, Users, Loader2, RefreshCw } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import UserAccessTable from '@/components/UserAccessTable';
import ErrorDisplay from '@/components/ErrorDisplay';
import AccountTypeIndicator from '@/components/AccountTypeIndicator';
import AuthGuard from '@/components/AuthGuard';
import { useRegion } from '@/contexts/RegionContext';
import { useOrganizationAccounts } from '@/hooks/useOrganizationAccounts';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { createAuthHeaders } from '@/lib/credentials';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { OrganizationUser, PaginationInfo } from '@/types/aws';

export default function ManagementAccountPage() {
  return (
    <AuthGuard>
      <ManagementAccountContent />
    </AuthGuard>
  );
}

function ManagementAccountContent() {
  const { awsRegion, ssoRegion } = useRegion();
  const { accounts } = useOrganizationAccounts();
  const capabilities = useAccountCapabilities(awsRegion, ssoRegion);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loadingBulkAccess, setLoadingBulkAccess] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadBulkAccessForUsers = useCallback(async (targetUsers: OrganizationUser[]) => {
    if (targetUsers.length === 0) return;
    
    setLoadingBulkAccess(true);
    
    const userIds = targetUsers.map(user => user.user.UserId);
    
    const response = await fetch('/api/organization/users/bulk-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthHeaders()
      },
      body: JSON.stringify({
        userIds,
        ssoRegion: encodeURIComponent(awsRegion),
        region: encodeURIComponent(awsRegion)
      }),
      cache: 'no-store'
    });
    
    if (response) {
      const result = await response.json();
      
      if (result.success) {
        setUsers(prevUsers => 
          prevUsers.map(user => ({
            ...user,
            accountAccess: result.data[user.user.UserId] || []
          }))
        );
      }
    }
    
    setLoadingBulkAccess(false);
  }, [awsRegion]);

  const fetchData = useCallback(async (page: number = 1, search: string = '', shouldClearData: boolean = false) => {
    setLoading(true);
    setError(null);
    
    if (shouldClearData) {
      setUsers([]);
      setPagination(null);
    }
    
    setSelectedUser(null);

    const usersUrl = `/api/organization/users?ssoRegion=${encodeURIComponent(awsRegion)}&region=${encodeURIComponent(awsRegion)}&page=${page}&limit=10${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    const usersResponse = await fetch(usersUrl, {
      headers: createAuthHeaders(),
      cache: 'no-store'
    });
    
    const usersData = await usersResponse.json();
    
    if (!usersData.success) {
      setError(usersData.error || 'Failed to fetch organization users');
    } else {
      setUsers(usersData.data || []);
      setPagination(usersData.pagination || null);

      if (usersData.data && usersData.data.length > 0) {
        loadBulkAccessForUsers(usersData.data);
      }
    }
    
    setLoading(false);
  }, [awsRegion, loadBulkAccessForUsers]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchData(page, searchTerm, false);
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    if (search === '') {
      setSearchLoading(false);
      setCurrentPage(1);
      fetchData(1, search, true);
      return;
    }
    
    loadingTimeoutRef.current = setTimeout(() => {
      setSearchLoading(true);
    }, 200);
    
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchData(1, search, true).finally(() => {
        setSearchLoading(false);
      });
    }, 500);
  };

  const handleRefresh = () => {
    fetchData(currentPage, searchTerm, false);
  };

  useEffect(() => {
    if (capabilities.hasManagementAccess && isInitialLoad) {
      setIsInitialLoad(false);
      fetchData(1, '', true);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [capabilities.hasManagementAccess, isInitialLoad, fetchData]);

  const actions = (
    <>
      <button
        onClick={handleRefresh}
        disabled={loading || !capabilities.hasManagementAccess}
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
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          title="Management Account"
          description="Organization users, accounts, and Identity Center (SSO)"
          icon={<Building2 className="h-12 w-12 text-blue-600" />}
          actions={actions}
        >
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {users.length} Users
            </div>
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              {accounts.length} Accounts
            </div>
          </div>
        </PageHeader>

        {/* Account Type Indicator */}
        <AccountTypeIndicator
          type="management"
          hasAccess={capabilities.hasManagementAccess}
          isChecking={capabilities.isChecking}
          error={capabilities.managementError}
        />

        {/* Show content only if has access */}
        {!capabilities.isChecking && !capabilities.hasManagementAccess && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
            <ErrorDisplay
              title="Management Account Required"
              message={capabilities.managementError || "This page requires AWS Organizations management account credentials to view organization users, accounts, and Identity Center (SSO)."}
              onRetry={handleRefresh}
              retryLabel="Check Again"
            />
          </div>
        )}

        {capabilities.hasManagementAccess && (
          <>
            {error && !isInitialLoad && (
              <ErrorDisplay
                message={error}
                onRetry={() => fetchData(currentPage, searchTerm, false)}
              />
            )}

            {isInitialLoad && loading ? (
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Loading organization data...</p>
                </div>
              </div>
            ) : (
              <>
                <UserAccessTable
                  users={users}
                  onSearchChange={handleSearchChange}
                  selectedUser={selectedUser || undefined}
                  searchTerm={searchTerm}
                  loading={loading}
                  searchLoading={searchLoading}
                  loadingBulkAccess={loadingBulkAccess}
                />
                
                {pagination && (
                  <div className="mt-4 bg-white rounded-lg shadow">
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                      <div className="flex items-center text-sm text-gray-700">
                        <span>
                          Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} total users)
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPreviousPage || loading}
                          className="flex items-center px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← Previous
                        </button>
                        
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              disabled={loading}
                              className={`px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                                pagination.currentPage === pageNum
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNextPage || loading}
                          className="flex items-center px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {users.length === 0 && !loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                    <p className="text-gray-600">
                      No users found in your organization accounts.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
