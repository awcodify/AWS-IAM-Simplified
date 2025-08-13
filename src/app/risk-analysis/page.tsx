'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, TrendingUp, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import RiskDashboard from '@/components/RiskDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useRegion } from '@/contexts/RegionContext';
import { useStreamingRiskAnalysis } from '@/hooks/useStreamingRiskAnalysis';
import type { OrganizationUser } from '@/types/aws';
import type { UserRiskProfile } from '@/types/risk-analysis';

export default function RiskAnalysisPage() {
  const { awsRegion, ssoRegion } = useRegion();
  const [permissionSets, setPermissionSets] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDismissed, setUserDismissed] = useState(false);
  
  // Use the streaming hook
  const {
    results: userRiskProfiles,
    progress,
    summary,
    isStreaming,
    error: streamingError,
    startStreaming,
    resetResults
  } = useStreamingRiskAnalysis();

  // Fetch permission sets for analysis
  useEffect(() => {
    const fetchPermissionSets = async () => {
      setLoading(true);
      setError(null);

      // Fetch permission sets directly instead of users
      const response = await fetch(`/api/permission-sets?region=${encodeURIComponent(awsRegion)}&ssoRegion=${encodeURIComponent(ssoRegion)}`, {
        cache: 'force-cache'
      });
      
      if (!response.ok) {
        setError(`Failed to fetch permission sets: ${response.statusText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setPermissionSets(data.data || []); // API returns permission sets in data.data
      setLoading(false);
    };

    fetchPermissionSets().catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to fetch permission sets');
      setLoading(false);
    });
  }, [ssoRegion]);

  // Auto-start streaming risk analysis when permission sets are loaded
  useEffect(() => {
    if (permissionSets.length > 0 && userRiskProfiles.length === 0 && !isStreaming && !userDismissed) {
      startStreaming(permissionSets, awsRegion, ssoRegion).catch(err => {
        setError(err instanceof Error ? err.message : 'Risk analysis failed');
      });
    }
  }, [permissionSets, userRiskProfiles.length, isStreaming, startStreaming, awsRegion, ssoRegion, userDismissed]);

  // Handle streaming error
  useEffect(() => {
    if (streamingError) {
      setError(streamingError);
    }
  }, [streamingError]);

  // Debug effect to log results changes
  useEffect(() => {
    console.log('Risk analysis results updated:', userRiskProfiles.length, userRiskProfiles);
  }, [userRiskProfiles]);

  const retryAnalysis = () => {
    setError(null);
    setUserDismissed(false); // Reset dismissed flag when retrying
    resetResults();
    if (permissionSets.length > 0) {
      startStreaming(permissionSets, awsRegion, ssoRegion).catch(err => {
        setError(err instanceof Error ? err.message : 'Risk analysis failed');
      });
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <PageHeader
            title="IAM Risk Analysis"
            description="Comprehensive security risk assessment for IAM permission sets"
            icon={<Shield className="h-12 w-12 text-red-600" />}
          />
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading permission sets...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error && permissionSets.length === 0) {
    return (
      <PageLayout>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <PageHeader
            title="IAM Risk Analysis"
            description="Comprehensive security risk assessment for IAM permission sets"
            icon={<AlertTriangle className="h-12 w-12 text-red-600" />}
          />
          <div className="p-6">
            <ErrorDisplay 
              message={error}
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <PageHeader
          title="IAM Risk Analysis"
          description="Real-time comprehensive security risk assessment for IAM permission sets"
          icon={<Shield className="h-12 w-12 text-red-600" />}
          rightText={`Last analyzed: ${new Date().toLocaleString()}`}
        />

        {/* Error Display */}
        {error && (
          <div className="p-6 border-b border-gray-200">
            <ErrorDisplay 
              message={error} 
              onRetry={retryAnalysis}
            />
          </div>
        )}

        {/* Risk Dashboard - shows results as they come in */}
        <div>
          <RiskDashboard 
            userRiskProfiles={userRiskProfiles}
            progress={progress}
            isStreaming={isStreaming}
            onRefresh={retryAnalysis}
          />
        </div>

        {/* Empty State */}
        {!loading && !isStreaming && permissionSets.length === 0 && (
          <div className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Permission Sets Found</h3>
            <p className="text-gray-600 mb-4">
              No permission sets were found in the specified region. Make sure you have:
            </p>
            <ul className="text-left text-gray-600 space-y-1 mb-6 max-w-md mx-auto">
              <li>• AWS SSO is set up in your organization</li>
              <li>• Permission sets are created in AWS SSO</li>
              <li>• You have the necessary permissions to view SSO resources</li>
              <li>• The correct region is selected</li>
            </ul>
            <Link
              href="/permission-sets"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Permission Sets
            </Link>
          </div>
        )}

        {/* Analysis Info */}
        {userRiskProfiles.length > 0 && (
          <div className="p-6 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">About This Analysis</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Real-time evaluation of permission sets for security risks</p>
              <p>• Identifies potential privilege escalation vulnerabilities</p>
              <p>• Detects administrative privileges and overly permissive policies</p>
              <p>• Analyzes AWS managed policies for security implications</p>
              <p>• Provides actionable recommendations for risk mitigation</p>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Analysis completed: {summary ? new Date().toLocaleString() : 'In progress...'}
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
