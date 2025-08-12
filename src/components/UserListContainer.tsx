'use client';

import { Users, Shield } from 'lucide-react';
import UserCard from './UserCard';
import type { IAMUser, OrganizationUser } from '@/types/aws';

interface BaseUserListProps {
  loading?: boolean;
  className?: string;
}

interface SingleAccountListProps extends BaseUserListProps {
  variant: 'single-account';
  users: IAMUser[];
  onUserSelect: (username: string) => void;
  selectedUser?: string;
}

interface OrganizationListProps extends BaseUserListProps {
  variant: 'organization';
  users: OrganizationUser[];
  onUserClick: (user: OrganizationUser) => void;
  selectedUser?: string;
  loadingUserAccess?: string | null;
}

type UserListContainerProps = SingleAccountListProps | OrganizationListProps;

export default function UserListContainer(props: UserListContainerProps) {
  const { loading, className, variant } = props;

  if (loading) {
    return (
      <div className={`w-full ${className || ''}`}>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (props.users.length === 0) {
    return (
      <div className={`text-center py-8 ${className || ''}`}>
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          {variant === 'single-account' 
            ? 'No IAM users found in this account.' 
            : 'No users found in your organization accounts.'}
        </p>
        {variant === 'organization' && (
          <div className="text-sm text-gray-500 space-y-2 mt-4">
            <p>This could mean:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>IAM Identity Center is not enabled</li>
              <li>No IAM users exist in the organization accounts you have access to</li>
              <li>You may not have sufficient permissions to list users</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'single-account') {
    const { users, onUserSelect, selectedUser } = props;
    
    return (
      <div className={`w-full ${className || ''}`}>
        <div className="space-y-3">
          {users.map((user) => (
            <UserCard
              key={user.UserId}
              variant="single-account"
              user={user}
              onClick={() => onUserSelect(user.UserName)}
              isSelected={selectedUser === user.UserName}
            />
          ))}
        </div>
        
        <div className="mt-6 p-3 bg-blue-50 rounded-md">
          <div className="flex">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">What you&apos;ll see:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• User&apos;s attached policies</li>
                <li>• Inline policies</li>
                <li>• Group memberships</li>
                <li>• Resource access permissions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Organization variant
  const { users, onUserClick, selectedUser, loadingUserAccess } = props;
  
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className || ''}`}>
      <div className="divide-y divide-gray-200">
        {users.map((orgUser) => (
          <UserCard
            key={orgUser.user.UserId}
            variant="organization"
            user={orgUser}
            accountAccess={orgUser.accountAccess}
            onClick={() => onUserClick(orgUser)}
            isExpanded={selectedUser === orgUser.user.UserId}
            loadingAccess={loadingUserAccess === orgUser.user.UserId}
          />
        ))}
      </div>
    </div>
  );
}
