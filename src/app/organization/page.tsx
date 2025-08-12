'use client';

import { Building2 } from 'lucide-react';
import OrganizationUserList from '@/components/OrganizationUserList';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
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
    <PageLayout accountInfo={accountInfo}>
      <div className="space-y-8">
        {/* Page Header */}
        <PageHeader
          title="Organization View"
          description="View which users have access to which accounts across your AWS Organization"
          icon={<Building2 className="h-12 w-12 text-blue-600" />}
        />

        {/* Organization User List */}
        <OrganizationUserList />
      </div>
    </PageLayout>
  );
}
