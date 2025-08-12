'use client';

import { Shield, Users, FileText, ExternalLink, Clock } from 'lucide-react';
import type { UserPermissions } from '@/types/aws';

interface PermissionViewProps {
  userPermissions: UserPermissions;
  accountId: string;
}

export default function PermissionView({ userPermissions, accountId }: PermissionViewProps) {
  const { user, attachedPolicies, inlinePolicies, groups } = userPermissions;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* User Info Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.UserName}</h2>
            <p className="text-sm text-gray-500 mt-1">Account: {accountId}</p>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              Created: {formatDate(user.CreateDate)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">User ID</p>
            <p className="text-sm font-mono text-gray-700">{user.UserId}</p>
            <p className="text-xs text-gray-500 mt-2">ARN</p>
            <p className="text-xs font-mono text-gray-700 break-all">{user.Arn}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Attached Policies</p>
              <p className="text-2xl font-bold text-blue-900">{attachedPolicies.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Inline Policies</p>
              <p className="text-2xl font-bold text-green-900">{inlinePolicies.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Groups</p>
              <p className="text-2xl font-bold text-purple-900">{groups.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attached Policies */}
      {attachedPolicies.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Attached Managed Policies
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {attachedPolicies.map((policy, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{policy.PolicyName}</p>
                    <p className="text-sm text-gray-600 font-mono">{policy.PolicyArn}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inline Policies */}
      {inlinePolicies.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Inline Policies
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {inlinePolicies.map((policy, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <p className="font-medium text-gray-900">{policy.PolicyName}</p>
                  </div>
                  <div className="p-3">
                    <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(JSON.parse(decodeURIComponent(policy.PolicyDocument)), null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Group Memberships
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {groups.map((group, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{group.GroupName}</p>
                    <p className="text-sm text-gray-600">{group.Path}</p>
                    <p className="text-xs text-gray-500">Created: {formatDate(group.CreateDate)}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Permissions Found */}
      {attachedPolicies.length === 0 && inlinePolicies.length === 0 && groups.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Shield className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-yellow-800">No Permissions Found</h3>
          <p className="text-sm text-yellow-700 mt-1">
            This user has no attached policies, inline policies, or group memberships.
          </p>
        </div>
      )}
    </div>
  );
}
