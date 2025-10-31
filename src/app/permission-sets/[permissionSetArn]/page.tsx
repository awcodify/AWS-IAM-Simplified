'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import PermissionSetDetails from '@/components/PermissionSetDetails';
import ErrorDisplay from '@/components/ErrorDisplay';
import AuthGuard from '@/components/AuthGuard';
import { useRegion } from '@/contexts/RegionContext';
import { createAuthHeaders } from '@/lib/credentials';
import type { PermissionSetDetails as PermissionSetDetailsType } from '@/types/aws';

export default function PermissionSetPage() {
  return (
    <AuthGuard>
      <PermissionSetContent />
    </AuthGuard>
  );
}

function PermissionSetContent() {
  const { awsRegion, identityCenterRegion } = useRegion();
  const params = useParams();
  const searchParams = useSearchParams();
  const permissionSetArn = decodeURIComponent(params.permissionSetArn as string);
  const accountId = searchParams.get('account');
  const userId = searchParams.get('user');
  const fallbackName = searchParams.get('name');
  const backUrl = searchParams.get('back') || '/organization';

  const [permissionSetData, setPermissionSetData] = useState<PermissionSetDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissionSetDetails = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        arn: permissionSetArn,
        region: awsRegion,
        ssoRegion: identityCenterRegion
      });
      
      if (fallbackName) {
        params.append('name', fallbackName);
      }

      const response = await fetch(`/api/permission-sets/details?${params}`, {
        cache: 'force-cache',
        headers: createAuthHeaders()
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch permission set details');
        setLoading(false);
        return;
      }

      setPermissionSetData(result.data);
      setLoading(false);
    };

    if (permissionSetArn && awsRegion && identityCenterRegion) {
      fetchPermissionSetDetails();
    }
  }, [permissionSetArn, awsRegion, identityCenterRegion, fallbackName]);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading permission set details...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Link 
              href={backUrl}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
          </div>
          <ErrorDisplay message={error} />
        </div>
      </PageLayout>
    );
  }

  if (!permissionSetData) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Link 
              href={backUrl}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500">Permission set not found</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={backUrl}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to {userId ? 'User Details' : 'Organization'}
            </Link>
          </div>
          
          {/* Breadcrumb context */}
          <div className="text-sm text-gray-500">
            {accountId && (
              <span>Account: {accountId}</span>
            )}
            {userId && (
              <span className="ml-2">User: {userId}</span>
            )}
          </div>
        </div>

        {/* Permission Set Details */}
        <PermissionSetDetails 
          permissionSet={permissionSetData}
          permissionSetArn={permissionSetArn}
          contextAccountId={accountId}
          contextUserId={userId}
        />
      </div>
    </PageLayout>
  );
}
