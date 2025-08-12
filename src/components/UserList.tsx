'use client';

import { Users, Shield, Calendar, Hash } from 'lucide-react';
import type { IAMUser } from '@/types/aws';

interface UserListProps {
  users: IAMUser[];
  onUserSelect: (username: string) => void;
  loading: boolean;
  selectedUser?: string;
}

export default function UserList({ users, onUserSelect, loading, selectedUser }: UserListProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="w-full">
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
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No IAM users found in this account.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">
            IAM Users ({users.length})
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          Click a user to view their permissions
        </div>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.UserId}
            onClick={() => onUserSelect(user.UserName)}
            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedUser === user.UserName
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-900 mr-3">
                    {user.UserName}
                  </h4>
                  {selectedUser === user.UserName && (
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
