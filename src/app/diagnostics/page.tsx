'use client';

import { AlertCircle } from 'lucide-react';
import AWSConfigDiagnostic from '@/components/AWSConfigDiagnostic';
import Header from '@/components/Header';
import { useRegion } from '@/contexts/RegionContext';
import { useState, useEffect, useCallback } from 'react';
import type { AccountInfo } from '@/types/aws';

export default function DiagnosticsPage() {
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">AWS Configuration Diagnostics</h1>
            <p className="text-gray-600 mt-2">
              Diagnose and troubleshoot AWS configuration and connectivity issues
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

        {/* AWS Config Diagnostic */}
        <AWSConfigDiagnostic />
      </div>
    </div>
  );
}
