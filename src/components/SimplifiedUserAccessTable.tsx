'use client';

import React, { useMemo } from 'react';
import { Users, Building2, Shield, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { OrganizationUser } from '@/types/aws';

import { ServiceIcon } from './ui/ServiceIcon';
import { SearchInput } from './ui/SearchInput';
import { TableSkeleton } from './ui/TableSkeleton';
import { extractServicesFromPermissionSet, getEstimatedServices } from '@/lib/utils/service-extractor';

interface UserAccessTableProps {
  users: OrganizationUser[];
  onSearchChange: (term: string) => void;
  selectedUser?: string | null;
  searchTerm?: string;
  loading?: boolean;
  searchLoading?: boolean;
  loadingBulkAccess?: boolean;
}

interface TableRow {
  id: string;
  user: OrganizationUser;
  accountCount: number;
  services: string[];
  totalPermissionSets: number;
  displayName: string;
  userName: string;
}

export default function SimplifiedUserAccessTable({ 
  users, 
  onSearchChange,
  selectedUser, 
  searchTerm = '',
  loading = false,
  searchLoading = false
}: UserAccessTableProps) {
  
  const tableData: TableRow[] = useMemo(() => {
    return users.map(user => {
      const accountCount = user.accountAccess?.filter(acc => acc.hasAccess).length || 0;
      const totalPermissionSets = user.accountAccess?.reduce((sum, acc) => 
        sum + (acc.permissionSets?.length || 0), 0) || 0;

      // Extract services from permission sets
      const allPermissionSets = user.accountAccess?.flatMap(acc => acc.permissionSets || []) || [];
      const extractedServices = allPermissionSets.flatMap(ps => {
        // Handle both string ARNs and PermissionSetDetails objects
        const arn = typeof ps === 'string' ? ps : ps.arn;
        return extractServicesFromPermissionSet(arn);
      });
      
      // Use estimated services if no specific services found
      const services = extractedServices.length > 0 
        ? [...new Set(extractedServices)]
        : getEstimatedServices(totalPermissionSets);

      return {
        id: user.user.UserId,
        user,
        accountCount,
        services: services.slice(0, 5), // Limit to 5 services for display
        totalPermissionSets,
        displayName: user.user.DisplayName || user.user.UserName,
        userName: user.user.UserName
      };
    });
  }, [users]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Organization Users ({users.length})
            </h2>
          </div>
          
          <div className="w-80">
            <SearchInput
              onSearchChange={onSearchChange}
              searchLoading={searchLoading}
              initialValue={searchTerm}
              placeholder="Search users by name or email..."
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accounts
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Services
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : (
              tableData.map((row) => (
                <UserRow
                  key={row.id}
                  row={row}
                  isSelected={selectedUser === row.id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && tableData.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'No users available in this organization.'}
          </p>
        </div>
      )}
    </div>
  );
}

interface UserRowProps {
  row: TableRow;
  isSelected: boolean;
}

function UserRow({ row, isSelected }: UserRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <>
      <tr 
        className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {row.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {row.displayName}
              </div>
              <div className="text-sm text-gray-500">
                {row.userName}
              </div>
            </div>
          </div>
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center">
            <Building2 className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-900">{row.accountCount}</span>
          </div>
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center space-x-1">
            {row.services.slice(0, 4).map((service: string, index: number) => (
              <div
                key={index}
                className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1"
              >
                <ServiceIcon service={service} className="w-3 h-3" />
                <span className="text-xs text-gray-700 capitalize">{service}</span>
              </div>
            ))}
            {row.services.length > 4 && (
              <span className="text-xs text-gray-500">+{row.services.length - 4}</span>
            )}
          </div>
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center">
            <Shield className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-900">{row.totalPermissionSets}</span>
          </div>
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <Link
              href={`/risk-analysis?userId=${row.user.user.UserId}`}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              Analyze Risk
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-4 py-3 bg-gray-50">
            <UserDetailsExpanded user={row.user} />
          </td>
        </tr>
      )}
    </>
  );
}

function UserDetailsExpanded({ user }: { user: OrganizationUser }) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Account Access Details</h4>
      
      {user.accountAccess && user.accountAccess.length > 0 ? (
        <div className="grid gap-2">
          {user.accountAccess
            .filter(acc => acc.hasAccess)
            .map((access, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                <div>
                  <div className="font-medium text-sm">
                    {access.accountName || access.accountId}
                  </div>
                  <div className="text-xs text-gray-500">
                    {access.permissionSets?.length || 0} permission sets
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {access.accessType}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No account access information available.</p>
      )}
    </div>
  );
}
