'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Users, Building2, Shield, Key, ChevronDown, ChevronRight, Search, Filter, Eye, Database, Server, ChevronLeft, Loader2 } from 'lucide-react';
import type { OrganizationUser, CrossAccountUserAccess, PaginationInfo } from '@/types/aws';

interface UserAccessTableProps {
  users: OrganizationUser[];
  pagination: PaginationInfo;
  onUserClick: (user: OrganizationUser) => void;
  onPageChange: (page: number) => void;
  onSearchChange: (term: string) => void;
  selectedUser?: string | null;
  loadingUserAccess?: string | null;
  searchTerm?: string;
  loading?: boolean;
  searchLoading?: boolean;
}

// Separate search component to maintain its own state
const SearchInput = ({ onSearchChange, searchLoading, initialValue = '' }: { 
  onSearchChange: (term: string) => void; 
  searchLoading: boolean;
  initialValue?: string;
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(initialValue);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [wasFocused, setWasFocused] = useState(false);

  // Update local state if initial value changes (e.g., external reset)
  useEffect(() => {
    setLocalSearchTerm(initialValue);
  }, [initialValue]);

  // Track focus state and restore focus after loading
  useEffect(() => {
    if (searchLoading && document.activeElement === searchInputRef.current) {
      setWasFocused(true);
    } else if (!searchLoading && wasFocused && searchInputRef.current) {
      // Restore focus after loading is complete
      searchInputRef.current.focus();
      setWasFocused(false);
    }
  }, [searchLoading, wasFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  };

  const handleFocus = () => {
    setWasFocused(true);
  };

  const handleBlur = () => {
    if (!searchLoading) {
      setWasFocused(false);
    }
  };

  return (
    <div className="relative">
      {searchLoading ? (
        <Loader2 className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 animate-spin" />
      ) : (
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      )}
      <input
        ref={searchInputRef}
        type="text"
        value={localSearchTerm}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search by name, username, or email..."
        className="w-full pl-10 pr-4 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
      />
    </div>
  );
};

// Table skeleton loading component
const TableLoadingSkeleton = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <tr key={index} className="animate-pulse">
        <td className="px-4 py-3">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-8"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex space-x-1">
            <div className="h-6 bg-gray-200 rounded-full w-12"></div>
            <div className="h-6 bg-gray-200 rounded-full w-10"></div>
            <div className="h-6 bg-gray-200 rounded-full w-8"></div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="h-6 bg-gray-200 rounded w-20"></div>
        </td>
      </tr>
    ))}
  </>
);

interface TableRow {
  userId: string;
  userName: string;
  displayName: string;
  email: string;
  homeAccount: string;
  accountAccess: CrossAccountUserAccess[];
  totalAccounts: number;
  accessibleAccounts: number;
  totalPermissionSets: number;
  services: string[];
}

export default function UserAccessTable({ 
  users, 
  pagination,
  onUserClick, 
  onPageChange,
  onSearchChange,
  selectedUser, 
  loadingUserAccess,
  searchTerm: externalSearchTerm = '',
  loading = false,
  searchLoading = false
}: UserAccessTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterByAccess, setFilterByAccess] = useState<'all' | 'hasAccess' | 'noAccess'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'accounts' | 'permissionSets' | 'services'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3':
        return <Database className="w-3 h-3 text-blue-600" />;
      case 'ec2':
        return <Server className="w-3 h-3 text-orange-600" />;
      case 'iam':
        return <Key className="w-3 h-3 text-red-600" />;
      case 'lambda':
        return <Server className="w-3 h-3 text-purple-600" />;
      default:
        return <Shield className="w-3 h-3 text-gray-600" />;
    }
  };

  const tableData: TableRow[] = useMemo(() => {
    return users.map(user => {
      const accessibleAccounts = user.accountAccess.filter(a => a.hasAccess);
      const totalPermissionSets = accessibleAccounts.reduce((sum, acc) => 
        sum + (acc.permissionSets?.length || acc.roles?.length || 0), 0
      );
      const uniqueServices = Array.from(new Set(
        accessibleAccounts.flatMap(acc => 
          acc.detailedAccess?.map(detail => detail.service) || []
        )
      ));

      return {
        userId: user.user.UserId,
        userName: user.user.UserName,
        displayName: user.user.DisplayName || user.user.UserName,
        email: user.user.Emails[0]?.Value || '',
        homeAccount: user.homeAccountId,
        accountAccess: user.accountAccess,
        totalAccounts: user.accountAccess.length,
        accessibleAccounts: accessibleAccounts.length,
        totalPermissionSets,
        services: uniqueServices
      };
    });
  }, [users]);

  // Since pagination is handled server-side, we only do client-side filtering for non-search filters
  const filteredAndSortedData = useMemo(() => {
    let filtered = tableData;
    
    // Apply local filter (not search since that's handled server-side)
    const matchesFilter = (row: TableRow) => {
      return filterByAccess === 'all' ||
        (filterByAccess === 'hasAccess' && row.accessibleAccounts > 0) ||
        (filterByAccess === 'noAccess' && row.accessibleAccounts === 0);
    };

    filtered = tableData.filter(matchesFilter);

    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case 'name':
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
        case 'accounts':
          aValue = a.accessibleAccounts;
          bValue = b.accessibleAccounts;
          break;
        case 'permissionSets':
          aValue = a.totalPermissionSets;
          bValue = b.totalPermissionSets;
          break;
        case 'services':
          aValue = a.services.length;
          bValue = b.services.length;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [tableData, filterByAccess, sortBy, sortOrder]);

  const toggleRowExpansion = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const PaginationControls = () => {
    if (!pagination) return null;

    const { currentPage, totalPages, totalUsers, hasNextPage, hasPreviousPage } = pagination;
    
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing page {currentPage} of {totalPages} ({totalUsers} total users)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={!hasPreviousPage || loading}
            className="flex items-center px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          
          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  disabled={loading}
                  className={`px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={!hasNextPage || loading}
            className="flex items-center px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Access Overview ({pagination ? `${pagination.totalUsers} total, ${filteredAndSortedData.length} on page` : `${filteredAndSortedData.length} users`})
          </h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <SearchInput 
              onSearchChange={onSearchChange}
              searchLoading={searchLoading}
              initialValue={externalSearchTerm}
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterByAccess}
              onChange={(e) => setFilterByAccess(e.target.value as 'all' | 'hasAccess' | 'noAccess')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              <option value="hasAccess">Has Access</option>
              <option value="noAccess">No Access</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                {/* Expand column */}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  User
                  {sortBy === 'name' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('accounts')}
              >
                <div className="flex items-center">
                  <Building2 className="w-3 h-3 mr-1" />
                  Accounts
                  {sortBy === 'accounts' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('permissionSets')}
              >
                <div className="flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Permission Sets
                  {sortBy === 'permissionSets' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('services')}
              >
                <div className="flex items-center">
                  <Key className="w-3 h-3 mr-1" />
                  Services
                  {sortBy === 'services' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quick Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Unified loading state */}
            {(loading || searchLoading) && (
              <>
                <tr>
                  <td colSpan={6} className="px-4 py-4 bg-blue-50">
                    <div className="flex items-center justify-center space-x-3">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-blue-700 font-medium">
                        {searchLoading ? 'Searching users...' : 'Loading users...'}
                      </span>
                      <span className="text-sm text-blue-600">
                        {searchLoading ? 'Please wait while we find matching users' : 'Fetching user data from organization accounts'}
                      </span>
                    </div>
                  </td>
                </tr>
                <TableLoadingSkeleton />
              </>
            )}
            
            {/* Regular table rows when not loading */}
            {!loading && !searchLoading && filteredAndSortedData.map((row) => (
              <React.Fragment key={row.userId}>
                {/* Main row */}
                <tr 
                  className={`hover:bg-gray-50 ${selectedUser === row.userId ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRowExpansion(row.userId)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedRows.has(row.userId) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {row.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {row.userName}
                      </div>
                      {row.email && (
                        <div className="text-xs text-gray-400">
                          {row.email}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${row.accessibleAccounts > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {row.accessibleAccounts}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">
                        / {row.totalAccounts}
                      </span>
                    </div>
                    {row.accessibleAccounts > 0 && (
                      <div className="text-xs text-gray-400">
                        {Math.round((row.accessibleAccounts / row.totalAccounts) * 100)}% coverage
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${row.totalPermissionSets > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {row.totalPermissionSets}
                    </span>
                    {row.totalPermissionSets > 0 && (
                      <div className="text-xs text-gray-400">
                        across {row.accessibleAccounts} account{row.accessibleAccounts !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.services.slice(0, 3).map((service, index) => (
                        <div key={index} className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
                          {getServiceIcon(service)}
                          <span className="text-xs text-gray-700 ml-1 capitalize">{service}</span>
                        </div>
                      ))}
                      {row.services.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{row.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        toggleRowExpansion(row.userId);
                        if (!expandedRows.has(row.userId)) {
                          onUserClick?.(users.find(u => u.user.UserId === row.userId)!);
                        }
                      }}
                      disabled={loadingUserAccess === row.userId}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {loadingUserAccess === row.userId ? 'Loading...' : expandedRows.has(row.userId) ? 'Hide Details' : 'View Details'}
                    </button>
                  </td>
                </tr>

                {/* Expanded row content */}
                {expandedRows.has(row.userId) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="space-y-6">
                        {/* User Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-blue-600">{row.accessibleAccounts}</div>
                            <div className="text-xs text-gray-600">Accessible Accounts</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-green-600">{row.totalPermissionSets}</div>
                            <div className="text-xs text-gray-600">Permission Sets</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-purple-600">{row.services.length}</div>
                            <div className="text-xs text-gray-600">AWS Services</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-xl font-bold text-orange-600">
                              {row.totalAccounts > 0 ? Math.round((row.accessibleAccounts / row.totalAccounts) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-600">Coverage</div>
                          </div>
                        </div>

                        {/* Services Overview */}
                        {row.services.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                              <Key className="w-4 h-4 mr-2" />
                              Accessible AWS Services ({row.services.length})
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {row.services.map((service, index) => (
                                <div key={index} className="flex items-center bg-white px-3 py-2 rounded-lg shadow-sm border">
                                  {getServiceIcon(service)}
                                  <span className="ml-2 text-sm font-medium text-gray-900 capitalize">{service}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Account Access Details for {row.displayName}
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {row.accountAccess.map((access) => (
                            <div 
                              key={access.accountId}
                              className={`border rounded-lg overflow-hidden shadow-sm ${
                                access.hasAccess ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {/* Account Header */}
                              <div className={`p-3 ${access.hasAccess ? 'bg-green-50' : 'bg-gray-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {access.accountName || access.accountId}
                                  </span>
                                  <span className={`w-3 h-3 rounded-full ${access.hasAccess ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                </div>
                                
                                <div className="text-xs text-gray-500 mb-2">
                                  {access.accountId}
                                </div>
                                
                                {access.accessType && (
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                    access.accessType === 'SSO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {access.accessType}
                                  </span>
                                )}
                              </div>
                              
                              {/* Access Details */}
                              {access.hasAccess && (
                                <div className="p-3">
                                  {/* Permission Sets */}
                                  {access.permissionSets && access.permissionSets.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-gray-600 mb-2 flex items-center">
                                        <Shield className="w-3 h-3 mr-1" />
                                        Permission Sets ({access.permissionSets.length})
                                      </div>
                                      <div className="space-y-2">
                                        {access.permissionSets.map((ps, index) => (
                                          <div key={index} className="bg-blue-50 rounded p-2">
                                            <div className="text-xs font-medium text-blue-900 mb-1">{ps.name}</div>
                                            {ps.description && (
                                              <div className="text-xs text-blue-700 mb-1">{ps.description}</div>
                                            )}
                                            {ps.sessionDuration && (
                                              <div className="text-xs text-blue-600">Session: {ps.sessionDuration}</div>
                                            )}
                                            {/* AWS Managed Policies */}
                                            {ps.managedPolicies && ps.managedPolicies.length > 0 && (
                                              <div className="mt-1">
                                                <div className="text-xs text-blue-600">AWS Managed Policies:</div>
                                                {ps.managedPolicies.slice(0, 3).map((policy, pIndex) => (
                                                  <div key={pIndex} className="text-xs text-blue-800 truncate">
                                                    • {policy.split('/').pop() || policy}
                                                  </div>
                                                ))}
                                                {ps.managedPolicies.length > 3 && (
                                                  <div className="text-xs text-blue-600">... +{ps.managedPolicies.length - 3} more</div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Service Access Summary */}
                                  {access.detailedAccess && access.detailedAccess.length > 0 && (
                                    <div>
                                      <div className="text-xs text-gray-600 mb-2 flex items-center">
                                        <Key className="w-3 h-3 mr-1" />
                                        Services ({Array.from(new Set(access.detailedAccess.map(d => d.service))).length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {Array.from(new Set(access.detailedAccess.map(d => d.service))).map((service, index) => (
                                          <div key={index} className="flex items-center bg-blue-50 px-2 py-1 rounded text-xs text-blue-700">
                                            {getServiceIcon(service)}
                                            <span className="ml-1 capitalize">{service}</span>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      {/* Quick Action Summary */}
                                      <div className="mt-2 text-xs text-gray-600">
                                        Total Actions: {access.detailedAccess.reduce((sum, detail) => sum + detail.actions.length, 0)}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Legacy roles display */}
                                  {access.roles && access.roles.length > 0 && (!access.permissionSets || access.permissionSets.length === 0) && (
                                    <div>
                                      <div className="text-xs text-gray-600 mb-1">Permission Sets:</div>
                                      {access.roles.map((role, index) => (
                                        <div key={index} className="text-xs text-blue-600 truncate">
                                          • {role.split('/').pop() || role}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Footer */}
                              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                                <div className="text-xs text-gray-400">
                                  Checked: {new Date(access.lastChecked).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !searchLoading && filteredAndSortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p>No users found matching your criteria.</p>
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControls />
    </div>
  );
}
