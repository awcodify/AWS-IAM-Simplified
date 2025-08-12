'use client';

import { Building2 } from 'lucide-react';
import OrganizationUserList from '@/components/OrganizationUserList';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { useRegion } from '@/contexts/RegionContext';
import { useState, useEffect, useCallback } from 'react';
import type { AccountInfo } from '@/types/aws';

export default function OrganizationPage() {
  const { awsRegion } = useRegion();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  const checkAWSConnection = useCallback(async () => {
    const response = await fetch(`/api/account?region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    const result = await response.json();
    
    if (result.success) {
      setAccountInfo(result.data);
    }
  }, [awsRegion]);

  useEffect(() => {
    checkAWSConnection();
  }, [checkAWSConnection]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header accountInfo={accountInfo} />
      
      {/* Navigation */}
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Organization View</h1>
            <p className="text-gray-600 mt-2">
              View which users have access to which accounts across your AWS Organization
            </p>
            <div className="mt-4 flex justify-center items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                Region: {awsRegion}
              </span>
              {accountInfo && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                  Account: {accountInfo.accountId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Organization User List */}
        <OrganizationUserList />
      </div>
    </div>
  );
}
