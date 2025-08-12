'use client';

import { Users, Calendar, Hash, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { IAMUser, OrganizationUser, CrossAccountUserAccess } from '@/types/aws';

interface BaseUserCardProps {
  onClick?: () => void;
  isSelected?: boolean;
  isLoading?: boolean;
  className?: string;
}

interface SingleAccountUserCardProps extends BaseUserCardProps {
  variant: 'single-account';
  user: IAMUser;
  statusText?: string;
}

interface OrganizationUserCardProps extends BaseUserCardProps {
  variant: 'organization';
  user: OrganizationUser;
  accountAccess: CrossAccountUserAccess[];
  statusText?: string;
  isExpanded?: boolean;
  onLoadAccess?: () => void;
  loadingAccess?: boolean;
}

type UserCardProps = SingleAccountUserCardProps | OrganizationUserCardProps;

export default function UserCard(props: UserCardProps) {
  const { onClick, isSelected, isLoading, className, variant } = props;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  if (variant === 'single-account') {
    const { user, statusText } = props;
    
    return (
      <div
        onClick={onClick}
        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        } ${className || ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h4 className="text-sm font-medium text-gray-900 mr-3">
                {user.UserName}
              </h4>
              {isSelected && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Selected
                </span>
              )}
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center">
                <Hash className="h-3 w-3 mr-1" />
                <span className="font-mono">{user.UserId}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Created {formatDate(user.CreateDate)}</span>
              </div>
              {user.Path !== '/' && (
                <div className="text-gray-500">
                  Path: {user.Path}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Organization variant
  const { user: orgUser, accountAccess, statusText, isExpanded, loadingAccess } = props as OrganizationUserCardProps;
  const user = orgUser.user;

  return (
    <div className={`p-6 ${className || ''}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center">
          <div className="bg-blue-100 rounded-full p-2 mr-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {user.DisplayName || user.UserName}
            </h3>
            <p className="text-sm text-gray-500">
              {user.UserName}
            </p>
            {user.Emails.length > 0 && (
              <p className="text-sm text-gray-400">
                {user.Emails[0].Value}
              </p>
            )}
            <p className="text-xs text-gray-400">
              Home Account: {orgUser.homeAccountId}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {loadingAccess ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : accountAccess.length > 0 ? (
            <span className="text-sm text-gray-500">
              {accountAccess.filter(a => a.hasAccess).length} / {accountAccess.length} accounts
            </span>
          ) : (
            <span className="text-sm text-gray-400">
              {statusText || 'Click to load access info'}
            </span>
          )}
          <svg 
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pl-12">
          {loadingAccess ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-gray-600">Loading account access...</span>
            </div>
          ) : accountAccess.length > 0 ? (
            <>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Account Access</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {accountAccess.map((access) => (
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
                        {access.roles.map((role: string, index: number) => (
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
  );
}
