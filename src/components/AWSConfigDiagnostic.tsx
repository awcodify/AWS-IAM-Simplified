'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  check: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: string;
}

export default function AWSConfigDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [ssoRegion, setSsoRegion] = useState<string>('us-east-1');

  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-west-2', label: 'Europe (London)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  ];

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    const checks: DiagnosticResult[] = [
      { check: 'AWS Connection', status: 'loading', message: 'Testing AWS credentials...' },
      { check: 'Account Info', status: 'loading', message: 'Getting account information...' },
      { check: 'Organization Access', status: 'loading', message: 'Checking organization permissions...' },
      { check: 'IAM Identity Center', status: 'loading', message: `Checking IAM Identity Center in ${ssoRegion}...` }
    ];

    setDiagnostics([...checks]);

    // Test AWS Connection
    fetch('/api/account', {
      cache: 'no-store'
    })
      .then(response => response.json())
      .then(accountData => {
        if (accountData.success) {
          checks[0] = { 
            check: 'AWS Connection', 
            status: 'success', 
            message: 'AWS credentials are valid',
            details: `Account: ${accountData.data.accountId}, User: ${accountData.data.arn}`
          };
          checks[1] = { 
            check: 'Account Info', 
            status: 'success', 
            message: `Connected to account ${accountData.data.accountId}`,
            details: accountData.data.arn
          };
        } else {
          checks[0] = { check: 'AWS Connection', status: 'error', message: accountData.error };
          checks[1] = { check: 'Account Info', status: 'error', message: 'Cannot get account info' };
        }
        setDiagnostics([...checks]);
      })
      .catch(error => {
        checks[0] = { check: 'AWS Connection', status: 'error', message: 'Failed to connect to AWS' };
        checks[1] = { check: 'Account Info', status: 'error', message: 'Cannot get account info' };
        setDiagnostics([...checks]);
      });

    // Test Organization Access
    fetch('/api/organization/accounts', {
      cache: 'no-store'
    })
      .then(response => response.json())
      .then(orgAccountsData => {
        if (orgAccountsData.success) {
          const accountCount = orgAccountsData.data?.length || 0;
          if (accountCount > 0) {
            checks[2] = { 
              check: 'Organization Access', 
              status: 'success', 
              message: `Found ${accountCount} organization accounts`,
              details: `This means you have access to AWS Organizations and can see accounts in your org.`
            };
          } else {
            checks[2] = { 
              check: 'Organization Access', 
              status: 'warning', 
              message: 'No organization accounts found',
              details: 'This account might not be part of an AWS Organization, or you might not have permissions to list accounts.'
            };
          }
        } else {
          checks[2] = { 
            check: 'Organization Access', 
            status: 'error', 
            message: 'Cannot access organization accounts',
            details: orgAccountsData.error
          };
        }
        setDiagnostics([...checks]);
      })
      .catch(error => {
        checks[2] = { 
          check: 'Organization Access', 
          status: 'error', 
          message: 'Failed to check organization access' 
        };
        setDiagnostics([...checks]);
      });

    // Test IAM Identity Center (simplified - just check if we can list users)
    fetch(`/api/organization/users?ssoRegion=${encodeURIComponent(ssoRegion)}`, {
      cache: 'no-store'
    })
      .then(response => response.json())
      .then(usersData => {
        if (usersData.success) {
          const userCount = usersData.data?.length || 0;
          if (userCount > 0) {
            checks[3] = { 
              check: 'IAM Identity Center', 
              status: 'success', 
              message: `Found ${userCount} users in ${ssoRegion}`,
              details: `IAM Identity Center is properly configured and accessible in region ${ssoRegion}. You can now use the Organization View.`
            };
          } else {
            checks[3] = { 
              check: 'IAM Identity Center', 
              status: 'warning', 
              message: `⚠️ No users found in ${ssoRegion}`,
              details: `IAM Identity Center is accessible in ${ssoRegion} but no users are configured, or they might be in a different region.`
            };
          }
        } else {
          checks[3] = { 
            check: 'IAM Identity Center', 
            status: 'error', 
            message: `❌ Not accessible in ${ssoRegion}`,
            details: `IAM Identity Center is not accessible in ${ssoRegion}. Try a different region or check if it's enabled.`
          };
        }
        setDiagnostics([...checks]);
        setIsRunning(false);
      })
      .catch(error => {
        checks[3] = { 
          check: 'IAM Identity Center', 
          status: 'error', 
          message: 'Failed to check IAM Identity Center',
          details: 'Network error or permission issue'
        };
        setDiagnostics([...checks]);
        setIsRunning(false);
      });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">AWS Configuration Diagnostic</h2>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            'Run Diagnostics'
          )}
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        This diagnostic will help identify issues with your AWS configuration for IAM Identity Center access.
      </p>

      {/* Region Selector */}
      <div className="mb-6">
        <label htmlFor="diagnostic-sso-region" className="block text-sm font-medium text-gray-700 mb-2">
          IAM Identity Center Region
        </label>
        <select
          id="diagnostic-sso-region"
          value={ssoRegion}
          onChange={(e) => setSsoRegion(e.target.value)}
          disabled={isRunning}
          className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
        >
          {awsRegions.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Select the region where your IAM Identity Center is configured
        </p>
      </div>

      {diagnostics.length > 0 && (
        <div className="space-y-4">
          {diagnostics.map((diagnostic, index) => (
            <div key={index} className={`border rounded-lg p-4 ${getStatusColor(diagnostic.status)}`}>
              <div className="flex items-center mb-2">
                {getStatusIcon(diagnostic.status)}
                <span className="ml-2 font-medium text-gray-900">{diagnostic.check}</span>
              </div>
              <p className="text-gray-700 mb-2">{diagnostic.message}</p>
              {diagnostic.details && (
                <p className="text-sm text-gray-600 bg-white bg-opacity-50 rounded p-2 border border-gray-200">
                  {diagnostic.details}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {diagnostics.length === 0 && (
        <div className="text-gray-500 text-center py-8">
          Click "Run Diagnostics" to check your AWS configuration
        </div>
      )}
    </div>
  );
}
