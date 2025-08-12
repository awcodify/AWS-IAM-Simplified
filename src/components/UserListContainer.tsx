'use client';

import { Users } from 'lucide-react';
import UserCard from './UserCard';
import type { OrganizationUser } from '@/types/aws';

interface UserListContainerProps {
  users: OrganizationUser[];
  onUserClick: (user: OrganizationUser) => void;
  selectedUser?: string;
  loadingUserAccess?: string | null;
  loading?: boolean;
  className?: string;
}

export default function UserListContainer(props: UserListContainerProps) {
  const { loading, className, users, onUserClick, selectedUser, loadingUserAccess } = props;

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

  if (users.length === 0) {
    return (
      <div className={`text-center py-8 ${className || ''}`}>
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          No users found in your organization accounts.
        </p>
        <div className="text-sm text-gray-500 space-y-2 mt-4">
          <p>This could mean:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>IAM Identity Center is not enabled</li>
            <li>No IAM users exist in the organization accounts you have access to</li>
            <li>You may not have sufficient permissions to list users</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className || ''}`}>
      <div className="divide-y divide-gray-200">
        {users.map((orgUser) => (
          <UserCard
            key={orgUser.user.UserId}
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
