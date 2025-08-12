'use client';

import UserListContainer from './UserListContainer';
import type { IAMUser } from '@/types/aws';

interface UserListProps {
  users: IAMUser[];
  onUserSelect: (username: string) => void;
  loading: boolean;
  selectedUser?: string;
}

export default function UserList({ users, onUserSelect, loading, selectedUser }: UserListProps) {
  return (
    <UserListContainer
      variant="single-account"
      users={users}
      onUserSelect={onUserSelect}
      loading={loading}
      selectedUser={selectedUser}
    />
  );
}
