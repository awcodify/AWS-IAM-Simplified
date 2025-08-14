/**
 * Settings page for managing authentication and preferences
 */
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import { 
  Settings, 
  User, 
  Globe, 
  LogOut, 
  Shield,
  Key,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { session, logout } = useAuth();
  const { awsRegion, ssoRegion, setAwsRegion } = useRegion();
  const [activeTab, setActiveTab] = useState<'account' | 'regions' | 'about'>('account');

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'regions', label: 'Regions', icon: Globe },
    { id: 'about', label: 'About', icon: Settings }
  ];

  return (
    <AuthGuard>
      <PageLayout>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <PageHeader
            title="Settings"
            description="Manage your authentication, regions, and preferences"
            icon={<Settings className="h-12 w-12 text-red-600" />}
          />

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'account' | 'regions' | 'about')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Account Information
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Your current AWS authentication details
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {session?.authMethod === 'access-keys' ? (
                          <Key className="h-6 w-6 text-green-500" />
                        ) : (
                          <User className="h-6 w-6 text-green-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {session?.authMethod === 'access-keys' ? 'Access Keys' : 'AWS Profile'}
                        </p>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <p className="text-sm text-gray-500">Connected</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Logout
                    </button>
                  </div>

                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    {session?.accountId && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Account ID</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{session.accountId}</dd>
                      </div>
                    )}
                    {session?.userId && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">User ID</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{session.userId}</dd>
                      </div>
                    )}
                    {session?.userName && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">User Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{session.userName}</dd>
                      </div>
                    )}
                    {session?.profile && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">AWS Profile</dt>
                        <dd className="mt-1 text-sm text-gray-900">{session.profile}</dd>
                      </div>
                    )}
                    {session?.expiresAt && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Session Expires</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(session.expiresAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">Security Note</h4>
                      <p className="mt-1 text-sm text-blue-700">
                        Your credentials are stored locally in your browser and are automatically cleared when you logout or the session expires.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'regions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Region Configuration
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Configure AWS regions for different services
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="awsRegion" className="block text-sm font-medium text-gray-700">
                      AWS Region
                    </label>
                    <select
                      id="awsRegion"
                      value={awsRegion}
                      onChange={(e) => setAwsRegion(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                      <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                      <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                      Primary region for AWS services and resources
                    </p>
                  </div>

                  <div>
                    <label htmlFor="ssoRegion" className="block text-sm font-medium text-gray-700">
                      IAM Identity Center Region
                    </label>
                    <select
                      id="ssoRegion"
                      value={ssoRegion}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm cursor-not-allowed"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                      <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                      <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                      Region where your IAM Identity Center (SSO) is configured (set via environment variable)
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        The IAM Identity Center region should match where your SSO instance is configured. 
                        This typically doesn&apos;t change once set up.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    AWS IAM Dashboard
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Simplify AWS IAM management across your organization
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Version</dt>
                      <dd className="mt-1 text-sm text-gray-900">1.0.0</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Built with</dt>
                      <dd className="mt-1 text-sm text-gray-900">Next.js 15, TypeScript, AWS SDK v3</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Purpose</dt>
                      <dd className="mt-1 text-sm text-gray-900">Cross-account IAM visibility and risk analysis</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">License</dt>
                      <dd className="mt-1 text-sm text-gray-900">MIT</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">Features</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                    <li>Organization-wide user access visualization</li>
                    <li>Real-time IAM risk analysis</li>
                    <li>Permission set management and monitoring</li>
                    <li>Cross-account access verification</li>
                    <li>Security recommendations and insights</li>
                  </ul>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <p className="text-sm text-gray-500">
                    For support or feature requests, please visit our{' '}
                    <a href="#" className="text-red-600 hover:text-red-500">
                      GitHub repository
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </AuthGuard>
  );
}
