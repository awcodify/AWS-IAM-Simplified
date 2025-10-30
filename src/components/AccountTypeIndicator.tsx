'use client';

import { CheckCircle2, XCircle, AlertCircle, Building2, Shield } from 'lucide-react';

interface AccountTypeIndicatorProps {
  type: 'management' | 'iam';
  hasAccess: boolean;
  isChecking?: boolean;
  error?: string;
}

export default function AccountTypeIndicator({ type, hasAccess, isChecking, error }: AccountTypeIndicatorProps) {
  const config = {
    management: {
      icon: Building2,
      title: 'Management Account',
      description: 'Required for organization-wide features and Identity Center (SSO)',
      color: 'blue'
    },
    iam: {
      icon: Shield,
      title: 'IAM Access',
      description: 'Access to IAM users, roles, and policies in current account',
      color: 'emerald'
    }
  };

  const { icon: Icon, title, description, color } = config[type];

  if (isChecking) {
    return (
      <div className={`flex items-center space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-lg`}>
        <AlertCircle className={`h-5 w-5 text-gray-400 animate-pulse`} />
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">Checking access...</p>
        </div>
      </div>
    );
  }

  // Build full class names for Tailwind purge compatibility
  const bgColorClass = hasAccess 
    ? (type === 'management' ? 'bg-blue-50' : 'bg-emerald-50')
    : 'bg-red-50';
  const borderColorClass = hasAccess
    ? (type === 'management' ? 'border-blue-200' : 'border-emerald-200')
    : 'border-red-200';
  const iconColorClass = hasAccess
    ? (type === 'management' ? 'text-blue-600' : 'text-emerald-600')
    : 'text-red-600';

  return (
    <div
      className={`flex items-center space-x-3 p-4 rounded-lg border ${bgColorClass} ${borderColorClass}`}
    >
      <div className="flex-shrink-0">
        {hasAccess ? (
          <CheckCircle2 className={`h-5 w-5 ${iconColorClass}`} />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${iconColorClass}`} />
          <p className={`text-sm font-medium ${hasAccess ? 'text-gray-900' : 'text-red-900'}`}>
            {title}
          </p>
        </div>
        <p className={`text-xs mt-0.5 ${hasAccess ? 'text-gray-600' : 'text-red-700'}`}>
          {hasAccess ? description : (error || 'Access not available')}
        </p>
      </div>
    </div>
  );
}
