'use client';

import { AlertCircle } from 'lucide-react';
import AWSConfigDiagnostic from '@/components/AWSConfigDiagnostic';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
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
    <PageLayout accountInfo={accountInfo}>
      <div className="space-y-8">
        {/* Page Header */}
        <PageHeader
          title="AWS Configuration Diagnostics"
          description="Diagnose and troubleshoot AWS configuration and connectivity issues"
          icon={<AlertCircle className="h-12 w-12 text-blue-600" />}
        />

        {/* AWS Config Diagnostic */}
        <AWSConfigDiagnostic />
      </div>
    </PageLayout>
  );
}
