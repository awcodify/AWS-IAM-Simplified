'use client';

import { Shield, Users, Server, Key, Building2 } from 'lucide-react';
import type { OrganizationUser } from '@/types/aws';

interface AccessSummaryProps {
  users: OrganizationUser[];
  totalAccounts: number;
}

export default function AccessSummary({ users, totalAccounts }: AccessSummaryProps) {
  const stats = {
    totalUsers: users.length,
    usersWithAccess: users.filter(user => 
      user.accountAccess.some(access => access.hasAccess)
    ).length,
    totalAccounts,
    accountsWithUsers: new Set(
      users.flatMap(user => 
        user.accountAccess
          .filter(access => access.hasAccess)
          .map(access => access.accountId)
      )
    ).size,
    totalPermissionSets: users.reduce((sum, user) => 
      sum + user.accountAccess.reduce((accSum, access) => 
        accSum + (access.permissionSets?.length || access.roles?.length || 0), 0
      ), 0
    ),
    uniqueServices: new Set(
      users.flatMap(user =>
        user.accountAccess.flatMap(access =>
          access.detailedAccess?.map(detail => detail.service) || []
        )
      )
    ).size,
    topServices: (() => {
      const serviceCounts = new Map<string, number>();
      users.forEach(user => {
        user.accountAccess.forEach(access => {
          access.detailedAccess?.forEach(detail => {
            const current = serviceCounts.get(detail.service) || 0;
            serviceCounts.set(detail.service, current + 1);
          });
        });
      });
      return Array.from(serviceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    })()
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3':
        return '🪣';
      case 'ec2':
        return '💻';
      case 'iam':
        return '🔐';
      case 'lambda':
        return '⚡';
      case 'rds':
        return '🗄️';
      case 'cloudwatch':
        return '📊';
      case 'dynamodb':
        return '📦';
      default:
        return '🔧';
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Shield className="w-5 h-5 mr-2 text-blue-600" />
        Access Overview
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.usersWithAccess}</div>
          <div className="text-xs text-gray-500">Active Users</div>
          <div className="text-xs text-gray-400">of {stats.totalUsers} total</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Building2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.accountsWithUsers}</div>
          <div className="text-xs text-gray-500">Accounts Used</div>
          <div className="text-xs text-gray-400">of {stats.totalAccounts} total</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Key className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.totalPermissionSets}</div>
          <div className="text-xs text-gray-500">Permission Sets</div>
          <div className="text-xs text-gray-400">assigned</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Server className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.uniqueServices}</div>
          <div className="text-xs text-gray-500">AWS Services</div>
          <div className="text-xs text-gray-400">accessible</div>
        </div>
      </div>

      {stats.topServices.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Most Used Services</h4>
          <div className="flex flex-wrap gap-2">
            {stats.topServices.map(([service, count]) => (
              <div 
                key={service}
                className="flex items-center bg-gray-50 px-2 py-1 rounded-lg text-sm"
              >
                <span className="mr-1">{getServiceIcon(service)}</span>
                <span className="capitalize font-medium">{service}</span>
                <span className="ml-1 text-gray-500">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
