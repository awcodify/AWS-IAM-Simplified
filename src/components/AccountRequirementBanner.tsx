'use client';

import { Info, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface AccountRequirementBannerProps {
  accountType: 'management' | 'any' | 'sso-enabled';
  feature: string;
  description?: string;
  variant?: 'info' | 'warning';
}

const accountTypeInfo = {
  management: {
    title: 'Management Account Required',
    description: 'This feature requires access to your AWS Organizations management account.',
    details: [
      'The management account has permissions to view organization users and accounts',
      'If you\'re not using the management account, you\'ll see limited data or errors'
    ]
  },
  'sso-enabled': {
    title: 'SSO-Enabled Account Required',
    description: 'This feature requires an account with AWS IAM Identity Center (SSO) enabled.',
    details: [
      'Permission sets are managed in the account where SSO is configured',
      'Typically this is the management account or a delegated administrator account'
    ]
  },
  any: {
    title: 'Any AWS Account',
    description: 'This feature works with any AWS account.',
    details: [
      'You can use any account with appropriate IAM permissions'
    ]
  }
};

export default function AccountRequirementBanner({
  accountType,
  feature,
  description,
  variant = 'info'
}: AccountRequirementBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const info = accountTypeInfo[accountType];
  
  const bgColor = variant === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
  const borderColor = variant === 'warning' ? 'border-amber-200' : 'border-blue-200';
  const textColor = variant === 'warning' ? 'text-amber-900' : 'text-blue-900';
  const iconColor = variant === 'warning' ? 'text-amber-600' : 'text-blue-600';
  const Icon = variant === 'warning' ? AlertCircle : Info;

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <Icon className={`${iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className={`text-sm font-semibold ${textColor}`}>
                {info.title}
              </h3>
              <p className={`text-sm ${textColor} opacity-90 mt-1`}>
                {description || info.description}
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs font-medium ${textColor} hover:underline flex-shrink-0`}
            >
              {isExpanded ? 'Show less' : 'Learn more'}
            </button>
          </div>
          
          {isExpanded && (
            <div className={`mt-3 pt-3 border-t ${borderColor}`}>
              <ul className={`text-sm ${textColor} opacity-90 space-y-2`}>
                {info.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              
              {accountType === 'management' && (
                <div className={`mt-3 text-xs ${textColor} opacity-75`}>
                  💡 Tip: Check your current account by running{' '}
                  <code className="bg-white bg-opacity-50 px-1 py-0.5 rounded">
                    aws sts get-caller-identity
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
