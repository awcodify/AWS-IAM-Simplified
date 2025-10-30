'use client';

import { Shield, Users, Key, FileText, Loader2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import AccountTypeIndicator from '@/components/AccountTypeIndicator';
import AuthGuard from '@/components/AuthGuard';
import { useRegion } from '@/contexts/RegionContext';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';

export default function IAMPage() {
  return (
    <AuthGuard>
      <IAMContent />
    </AuthGuard>
  );
}

function IAMContent() {
  const { awsRegion, ssoRegion } = useRegion();
  const capabilities = useAccountCapabilities(awsRegion, ssoRegion);

  return (
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          title="IAM (Current Account)"
          description="Manage IAM users, roles, and policies in the current AWS account"
          icon={<Shield className="h-12 w-12 text-emerald-600" />}
        >
          <p className="text-sm text-gray-500 mt-2">
            Access local IAM resources in any AWS account
          </p>
        </PageHeader>

        {/* Account Type Indicator */}
        <AccountTypeIndicator
          type="iam"
          hasAccess={capabilities.hasIAMAccess}
          isChecking={capabilities.isChecking}
        />

        {/* IAM Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IAM Users */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">IAM Users</h3>
                <p className="text-sm text-gray-600">View and manage IAM users</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">List and manage IAM users in this account</p>
            </div>
          </div>

          {/* IAM Roles */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 rounded-lg p-3 mr-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">IAM Roles</h3>
                <p className="text-sm text-gray-600">View and manage IAM roles</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">List and manage IAM roles in this account</p>
            </div>
          </div>

          {/* IAM Policies */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-emerald-100 rounded-lg p-3 mr-4">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">IAM Policies</h3>
                <p className="text-sm text-gray-600">View and manage IAM policies</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">List and analyze IAM policies</p>
            </div>
          </div>

          {/* Access Keys */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 rounded-lg p-3 mr-4">
                <Key className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Access Keys</h3>
                <p className="text-sm text-gray-600">Manage IAM user access keys</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Coming soon</p>
              <p className="text-xs text-gray-500 mt-1">View and rotate access keys</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">About IAM Access</h3>
              <div className="mt-2 text-sm text-blue-800">
                <p>
                  IAM (Identity and Access Management) features are available in <strong>any AWS account</strong>.
                  These features allow you to manage local users, roles, and policies within the current account.
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Works in both management and member accounts</li>
                  <li>Manages resources specific to this account</li>
                  <li>Different from organization-wide Identity Center (SSO)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
