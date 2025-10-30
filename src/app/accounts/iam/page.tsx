'use client';

import { useState } from 'react';
import { Shield, Users, Key, FileText, Loader2, AlertCircle, RefreshCw, Mail, Calendar, CheckCircle, XCircle, Search, Filter, Lock, FolderTree, Code, ChevronDown, ChevronRight } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import AccountTypeIndicator from '@/components/AccountTypeIndicator';
import AuthGuard from '@/components/AuthGuard';
import { useRegion } from '@/contexts/RegionContext';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { useIAMUsers } from '@/hooks/useIAMUsers';
import { useIAMUserPermissions } from '@/hooks/useIAMUserPermissions';
import type { OrganizationUser } from '@/types/aws';

export default function IAMPage() {
  return (
    <AuthGuard>
      <IAMContent />
    </AuthGuard>
  );
}

function IAMContent() {
  const { awsRegion, ssoRegion } = useRegion();
  const capabilities = useAccountCapabilities(awsRegion, ssoRegion);
  const { users, loading, error, accountId, refetch } = useIAMUsers(awsRegion);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());

  // Fetch permissions for selected user
  const { 
    permissions, 
    loading: permissionsLoading, 
    error: permissionsError 
  } = useIAMUserPermissions(
    selectedUser?.user.UserName || null, 
    awsRegion
  );

  const handleUserClick = (user: OrganizationUser) => {
    setSelectedUser(selectedUser?.user.UserId === user.user.UserId ? null : user);
    setExpandedPolicies(new Set()); // Reset expanded state when changing users
  };

  const togglePolicy = (policyId: string) => {
    setExpandedPolicies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(policyId)) {
        newSet.delete(policyId);
      } else {
        newSet.add(policyId);
      }
      return newSet;
    });
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.user.UserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user.Emails.some(email => email.Value?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          title="IAM (Current Account)"
          description="Manage IAM users, roles, and policies in the current AWS account"
          icon={<Shield className="h-12 w-12 text-emerald-600" />}
        >
          <p className="text-sm text-gray-500 mt-2">
            Access local IAM resources in any AWS account
          </p>
        </PageHeader>

        {/* Account Type Indicator */}
        <AccountTypeIndicator
          type="iam"
          hasAccess={capabilities.hasIAMAccess}
          isChecking={capabilities.isChecking}
        />

        {/* Statistics Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-blue-900">{users.length}</p>
                </div>
                <div className="bg-blue-200 rounded-full p-3">
                  <Users className="w-8 h-8 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Account ID</p>
                  <p className="text-lg font-bold text-emerald-900 truncate">{accountId || 'Loading...'}</p>
                </div>
                <div className="bg-emerald-200 rounded-full p-3">
                  <Shield className="w-8 h-8 text-emerald-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Access Type</p>
                  <p className="text-xl font-bold text-purple-900">IAM Local</p>
                </div>
                <div className="bg-purple-200 rounded-full p-3">
                  <Key className="w-8 h-8 text-purple-700" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IAM Users Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center">
                <div className="bg-blue-500 rounded-lg p-3 mr-4 shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">IAM Users</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {loading ? 'Loading...' : `${filteredUsers.length} of ${users.length} user${users.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Search Box */}
                {!loading && !error && users.length > 0 && (
                  <div className="relative flex-1 lg:flex-none lg:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                
                {/* Refresh Button */}
                <button
                  onClick={refetch}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error State */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-base font-semibold text-red-900">Error Loading IAM Users</h3>
                    <p className="mt-2 text-sm text-red-800">{error}</p>
                    <button
                      onClick={refetch}
                      className="mt-4 text-sm font-medium text-red-700 hover:text-red-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600 font-medium">Loading IAM users...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && users.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No IAM Users Found</h3>
                <p className="text-gray-600 mb-6">There are no IAM users in this AWS account.</p>
                <button
                  onClick={refetch}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
            )}

            {/* No Search Results */}
            {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No users match your search</h3>
                <p className="text-gray-600 mb-4">Try adjusting your search term</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Users Grid */}
            {!error && !loading && filteredUsers.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    User List
                  </h4>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.user.UserId}
                        onClick={() => handleUserClick(user)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedUser?.user.UserId === user.user.UserId
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-semibold text-gray-900 truncate">
                                {user.user.DisplayName || user.user.UserName}
                              </h5>
                              {user.user.Active && (
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate mb-2">
                              @{user.user.UserName}
                            </p>
                            {user.user.Emails.length > 0 && (
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{user.user.Emails[0].Value}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              IAM
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Details */}
                <div className="lg:sticky lg:top-6 h-fit">
                  {selectedUser ? (
                    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg shadow-md">
                      {/* User Header */}
                      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-500 rounded-full p-4 shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xl font-bold text-gray-900 mb-1 truncate">
                              {selectedUser.user.DisplayName || selectedUser.user.UserName}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              @{selectedUser.user.UserName}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                IAM User
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="p-6 space-y-4">
                        <div>
                          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            User Details
                          </h5>
                          <div className="space-y-3">
                            <div className="flex items-start">
                              <Key className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">User ID</p>
                                <p className="text-sm font-mono text-gray-900 break-all">
                                  {selectedUser.user.UserId}
                                </p>
                              </div>
                            </div>
                            {selectedUser.user.Emails.length > 0 && (
                              <div className="flex items-start">
                                <Mail className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">Email</p>
                                  <p className="text-sm text-gray-900 break-all">
                                    {selectedUser.user.Emails[0].Value}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Account Access */}
                        <div className="pt-4 border-t border-gray-200">
                          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Account Access
                          </h5>
                          <div className="space-y-2">
                            {selectedUser.accountAccess.map((access) => (
                              <div 
                                key={access.accountId}
                                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {access.accountName}
                                  </p>
                                  <p className="text-xs text-gray-600 font-mono truncate">
                                    {access.accountId}
                                  </p>
                                </div>
                                <div className="ml-3 flex-shrink-0">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    access.hasAccess 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {access.accessType}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Permissions Section */}
                        <div className="pt-4 border-t border-gray-200">
                          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                            <Lock className="w-3 h-3 mr-1" />
                            Permissions & Access
                          </h5>

                          {permissionsLoading && (
                            <div className="text-center py-6">
                              <Loader2 className="h-6 w-6 text-blue-600 mx-auto mb-2 animate-spin" />
                              <p className="text-xs text-gray-500">Loading permissions...</p>
                            </div>
                          )}

                          {permissionsError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700">{permissionsError}</p>
                              </div>
                            </div>
                          )}

                          {!permissionsLoading && !permissionsError && permissions && (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                              {/* Summary Stats */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-blue-50 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-blue-900">
                                    {permissions.attachedPolicies.length}
                                  </p>
                                  <p className="text-[10px] text-blue-700 font-medium">Direct Policies</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-purple-900">
                                    {permissions.inlinePolicies.length}
                                  </p>
                                  <p className="text-[10px] text-purple-700 font-medium">Inline</p>
                                </div>
                                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                  <p className="text-lg font-bold text-emerald-900">
                                    {permissions.groups.length}
                                  </p>
                                  <p className="text-[10px] text-emerald-700 font-medium">
                                    Groups
                                    {(() => {
                                      const groupPoliciesCount = permissions.groups.reduce(
                                        (sum, g) => sum + (g.attachedPolicies?.length || 0) + (g.inlinePolicies?.length || 0), 
                                        0
                                      );
                                      return groupPoliciesCount > 0 ? ` (${groupPoliciesCount} policies)` : '';
                                    })()}
                                  </p>
                                </div>
                              </div>

                              {/* Attached Policies */}
                              <div>
                                <h6 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                                  <FileText className="w-3 h-3 mr-1.5" />
                                  Managed Policies
                                </h6>
                                {permissions.attachedPolicies.length > 0 ? (
                                  <div className="space-y-2">
                                    {permissions.attachedPolicies.map((policy, idx) => {
                                      const policyId = `managed-${idx}`;
                                      const isExpanded = expandedPolicies.has(policyId);
                                      const hasPermissions = policy.permissions && policy.permissions.length > 0;
                                      
                                      return (
                                        <div 
                                          key={idx}
                                          className="bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                          <button
                                            onClick={() => hasPermissions && togglePolicy(policyId)}
                                            className="w-full p-2.5 text-left"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-blue-900 mb-0.5 text-xs">
                                                  {policy.PolicyName}
                                                </p>
                                                <p className="text-blue-700 font-mono text-[10px] break-all">
                                                  {policy.PolicyArn}
                                                </p>
                                              </div>
                                              {hasPermissions && (
                                                <div className="ml-2 flex-shrink-0">
                                                  {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                                  ) : (
                                                    <ChevronRight className="w-4 h-4 text-blue-600" />
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </button>
                                          
                                          {/* Show permissions when expanded */}
                                          {isExpanded && hasPermissions && (
                                            <div className="px-2.5 pb-2.5 pt-0 border-t border-blue-200">
                                              <div className="space-y-1.5 mt-2">
                                                {policy.permissions!.map((perm, permIdx) => (
                                                  <div key={permIdx} className="bg-white bg-opacity-60 rounded p-2">
                                                    <div className="flex items-start gap-1.5 mb-1">
                                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                        perm.effect === 'Allow' 
                                                          ? 'bg-green-100 text-green-800' 
                                                          : 'bg-red-100 text-red-800'
                                                      }`}>
                                                        {perm.effect}
                                                      </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                      <div>
                                                        <p className="text-[10px] font-medium text-gray-600 mb-0.5">Actions:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                          {perm.actions.slice(0, 5).map((action, actIdx) => (
                                                            <span 
                                                              key={actIdx}
                                                              className="inline-block bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono"
                                                            >
                                                              {action}
                                                            </span>
                                                          ))}
                                                          {perm.actions.length > 5 && (
                                                            <span className="text-[9px] text-gray-500">
                                                              +{perm.actions.length - 5} more
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <p className="text-[10px] font-medium text-gray-600 mb-0.5">Resources:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                          {perm.resources.slice(0, 2).map((resource, resIdx) => (
                                                            <span 
                                                              key={resIdx}
                                                              className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px] font-mono"
                                                            >
                                                              {resource.length > 30 ? `${resource.substring(0, 30)}...` : resource}
                                                            </span>
                                                          ))}
                                                          {perm.resources.length > 2 && (
                                                            <span className="text-[9px] text-gray-500">
                                                              +{perm.resources.length - 2} more
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <FileText className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                    <p className="text-xs text-gray-500">No managed policies attached</p>
                                  </div>
                                )}
                              </div>

                              {/* Inline Policies */}
                              <div>
                                <h6 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                                  <Code className="w-3 h-3 mr-1.5" />
                                  Inline Policies
                                </h6>
                                {permissions.inlinePolicies.length > 0 ? (
                                  <div className="space-y-2">
                                    {permissions.inlinePolicies.map((policy, idx) => (
                                      <div 
                                        key={idx}
                                        className="bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                      >
                                        <div className="p-2.5">
                                          <p className="font-semibold text-purple-900 text-xs mb-2">
                                            {policy.PolicyName}
                                          </p>
                                          
                                          {/* Show permissions */}
                                          {policy.permissions && policy.permissions.length > 0 && (
                                            <div className="space-y-1.5">
                                              {policy.permissions.map((perm, permIdx) => (
                                                <div key={permIdx} className="bg-white bg-opacity-60 rounded p-2">
                                                  <div className="flex items-start gap-1.5 mb-1">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                      perm.effect === 'Allow' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                      {perm.effect}
                                                    </span>
                                                  </div>
                                                  <div className="space-y-1">
                                                    <div>
                                                      <p className="text-[10px] font-medium text-gray-600 mb-0.5">Actions:</p>
                                                      <div className="flex flex-wrap gap-1">
                                                        {perm.actions.slice(0, 5).map((action, actIdx) => (
                                                          <span 
                                                            key={actIdx}
                                                            className="inline-block bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[9px] font-mono"
                                                          >
                                                            {action}
                                                          </span>
                                                        ))}
                                                        {perm.actions.length > 5 && (
                                                          <span className="text-[9px] text-gray-500">
                                                            +{perm.actions.length - 5} more
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div>
                                                      <p className="text-[10px] font-medium text-gray-600 mb-0.5">Resources:</p>
                                                      <div className="flex flex-wrap gap-1">
                                                        {perm.resources.slice(0, 2).map((resource, resIdx) => (
                                                          <span 
                                                            key={resIdx}
                                                            className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px] font-mono"
                                                          >
                                                            {resource.length > 30 ? `${resource.substring(0, 30)}...` : resource}
                                                          </span>
                                                        ))}
                                                        {perm.resources.length > 2 && (
                                                          <span className="text-[9px] text-gray-500">
                                                            +{perm.resources.length - 2} more
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <Code className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                    <p className="text-xs text-gray-500">No inline policies</p>
                                  </div>
                                )}
                              </div>

                              {/* Groups */}
                              <div>
                                <h6 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                                  <FolderTree className="w-3 h-3 mr-1.5" />
                                  Group Memberships
                                </h6>
                                {permissions.groups.length > 0 ? (
                                  <div className="space-y-2">
                                    {permissions.groups.map((group, idx) => {
                                      const groupId = `group-${idx}`;
                                      const isExpanded = expandedPolicies.has(groupId);
                                      const hasPolicies = (group.attachedPolicies && group.attachedPolicies.length > 0) || 
                                                         (group.inlinePolicies && group.inlinePolicies.length > 0);
                                      
                                      return (
                                        <div 
                                          key={idx}
                                          className="bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                        >
                                          <button
                                            onClick={() => hasPolicies && togglePolicy(groupId)}
                                            className="w-full p-2.5 text-left"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-emerald-900 mb-0.5 text-xs">
                                                  {group.GroupName}
                                                </p>
                                                <p className="text-emerald-700 font-mono text-[10px] break-all">
                                                  {group.Arn}
                                                </p>
                                                {hasPolicies && (
                                                  <p className="text-[10px] text-emerald-600 mt-1">
                                                    {(group.attachedPolicies?.length || 0) + (group.inlinePolicies?.length || 0)} policies
                                                  </p>
                                                )}
                                              </div>
                                              {hasPolicies && (
                                                <div className="ml-2 flex-shrink-0">
                                                  {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-emerald-600" />
                                                  ) : (
                                                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </button>
                                          
                                          {/* Show group policies when expanded */}
                                          {isExpanded && hasPolicies && (
                                            <div className="px-2.5 pb-2.5 pt-0 border-t border-emerald-200">
                                              <div className="space-y-2 mt-2">
                                                {/* Attached Policies */}
                                                {group.attachedPolicies && group.attachedPolicies.length > 0 && (
                                                  <div>
                                                    <p className="text-[10px] font-semibold text-emerald-800 mb-1">Attached Policies:</p>
                                                    {group.attachedPolicies.map((policy, pIdx) => (
                                                      <div key={pIdx} className="bg-white bg-opacity-60 rounded p-2 mb-1">
                                                        <p className="text-[10px] font-semibold text-gray-900 mb-0.5">
                                                          {policy.PolicyName}
                                                        </p>
                                                        <p className="text-[9px] text-gray-600 font-mono break-all mb-1">
                                                          {policy.PolicyArn}
                                                        </p>
                                                        {policy.permissions && policy.permissions.length > 0 && (
                                                          <div className="space-y-1 mt-1.5 pl-2 border-l-2 border-emerald-300">
                                                            {policy.permissions.map((perm, permIdx) => (
                                                              <div key={permIdx} className="bg-gray-50 rounded p-1.5">
                                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold ${
                                                                  perm.effect === 'Allow' 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                  {perm.effect}
                                                                </span>
                                                                <div className="mt-1 space-y-0.5">
                                                                  <div className="flex flex-wrap gap-0.5">
                                                                    {perm.actions.slice(0, 3).map((action, actIdx) => (
                                                                      <span 
                                                                        key={actIdx}
                                                                        className="inline-block bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-[8px] font-mono"
                                                                      >
                                                                        {action}
                                                                      </span>
                                                                    ))}
                                                                    {perm.actions.length > 3 && (
                                                                      <span className="text-[8px] text-gray-500">
                                                                        +{perm.actions.length - 3}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Inline Policies */}
                                                {group.inlinePolicies && group.inlinePolicies.length > 0 && (
                                                  <div>
                                                    <p className="text-[10px] font-semibold text-emerald-800 mb-1">Inline Policies:</p>
                                                    {group.inlinePolicies.map((policy, pIdx) => (
                                                      <div key={pIdx} className="bg-white bg-opacity-60 rounded p-2 mb-1">
                                                        <p className="text-[10px] font-semibold text-gray-900 mb-1">
                                                          {policy.PolicyName}
                                                        </p>
                                                        {policy.permissions && policy.permissions.length > 0 && (
                                                          <div className="space-y-1 pl-2 border-l-2 border-emerald-300">
                                                            {policy.permissions.map((perm, permIdx) => (
                                                              <div key={permIdx} className="bg-gray-50 rounded p-1.5">
                                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold ${
                                                                  perm.effect === 'Allow' 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                  {perm.effect}
                                                                </span>
                                                                <div className="mt-1 space-y-0.5">
                                                                  <div className="flex flex-wrap gap-0.5">
                                                                    {perm.actions.slice(0, 3).map((action, actIdx) => (
                                                                      <span 
                                                                        key={actIdx}
                                                                        className="inline-block bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-[8px] font-mono"
                                                                      >
                                                                        {action}
                                                                      </span>
                                                                    ))}
                                                                    {perm.actions.length > 3 && (
                                                                      <span className="text-[8px] text-gray-500">
                                                                        +{perm.actions.length - 3}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <FolderTree className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                    <p className="text-xs text-gray-500">No group memberships</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Note */}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>
                              This is a local IAM user in account <span className="font-mono font-semibold">{accountId}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-lg text-center py-16 px-6">
                      <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Select a User</h4>
                      <p className="text-sm text-gray-600">
                        Click on a user from the list to view their details and access information
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IAM Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IAM Users */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">IAM Users</h3>
                <p className="text-sm text-gray-600">View and manage IAM users</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">List and manage IAM users in this account</p>
            </div>
          </div>

          {/* IAM Roles */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 rounded-lg p-3 mr-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">IAM Roles</h3>
                <p className="text-sm text-gray-600">View and manage IAM roles</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">List and manage IAM roles in this account</p>
            </div>
          </div>

          {/* IAM Policies */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-emerald-100 rounded-lg p-3 mr-4">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">IAM Policies</h3>
                <p className="text-sm text-gray-600">View and manage IAM policies</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">List and analyze IAM policies</p>
            </div>
          </div>

          {/* Access Keys */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 rounded-lg p-3 mr-4">
                <Key className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Access Keys</h3>
                <p className="text-sm text-gray-600">Manage IAM user access keys</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">View and rotate access keys</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">About IAM Access</h3>
              <div className="mt-2 text-sm text-blue-800">
                <p>
                  IAM (Identity and Access Management) features are available in <strong>any AWS account</strong>.
                  These features allow you to manage local users, roles, and policies within the current account.
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Works in both management and member accounts</li>
                  <li>Manages resources specific to this account</li>
                  <li>Different from organization-wide Identity Center (SSO)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
