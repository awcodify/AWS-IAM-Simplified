'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import RiskDashboard from '@/components/RiskDashboard';
import ErrorDisplay from '@/components/ErrorDisplay';
import AccountRequirementBanner from '@/components/AccountRequirementBanner';
import AuthGuard from '@/components/AuthGuard';
import { useRegion } from '@/contexts/RegionContext';
import { useStreamingRiskAnalysis } from '@/hooks/useStreamingRiskAnalysis';
import { usePermissionSets } from '@/hooks/usePermissionSets';

export default function RiskAnalysisPage() {
  return (
    <AuthGuard>
      <RiskAnalysisContent />
    </AuthGuard>
  );
}

function RiskAnalysisContent() {
  const { awsRegion, ssoRegion } = useRegion();
  const { permissionSets, loading, error: permissionSetsError } = usePermissionSets();
  const [userDismissed, setUserDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use the streaming hook
  const {
    results: userRiskProfiles,
    progress,
    summary,
    isStreaming,
    error: streamingError,
    startStreaming,
    resetResults,
    canStartNewScan
  } = useStreamingRiskAnalysis();

  // Auto-start streaming risk analysis when permission sets are loaded
  useEffect(() => {
    // Only start if:
    // 1. We have permission sets
    // 2. User hasn't dismissed the scan
    // 3. We can start a new scan (no duplicate running)
    if (permissionSets.length > 0 && !userDismissed && canStartNewScan(permissionSets, awsRegion, ssoRegion)) {
      // Only start if no results exist yet or if the scan is not currently running
      if (userRiskProfiles.length === 0 && !isStreaming) {
        console.log('Starting new risk analysis scan...');
        startStreaming(permissionSets, awsRegion, ssoRegion).catch(err => {
          setError(err instanceof Error ? err.message : 'Risk analysis failed');
        });
      }
    } else if (permissionSets.length > 0 && !canStartNewScan(permissionSets, awsRegion, ssoRegion)) {
      console.log('Scan already running with same parameters, using existing session');
    }
  }, [permissionSets, userDismissed, canStartNewScan, userRiskProfiles.length, isStreaming, startStreaming, awsRegion, ssoRegion]);

  // Handle streaming error or permission sets error
  useEffect(() => {
    if (streamingError) {
      setError(streamingError);
    } else if (permissionSetsError) {
      setError(permissionSetsError);
    }
  }, [streamingError, permissionSetsError]);

  // Debug effect to log results changes
  useEffect(() => {
    console.log('Risk analysis results updated:', userRiskProfiles.length, userRiskProfiles);
  }, [userRiskProfiles]);

  const retryAnalysis = () => {
    setError(null);
    setUserDismissed(false); // Reset dismissed flag when retrying
    resetResults();
    if (permissionSets.length > 0) {
      console.log('Retrying risk analysis scan...');
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

        {/* Account Requirement Banner */}
        <div className="p-6 pt-4 border-b border-gray-200">
          <AccountRequirementBanner
            accountType="sso-enabled"
            feature="Risk Analysis"
            description="Risk analysis requires access to permission sets and user data from your SSO-enabled account."
          />
        </div>

        {/* Reconnection Notification */}
        {!canStartNewScan(permissionSets, awsRegion, ssoRegion) && isStreaming && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
            <div className="flex">
              <div className="flex-shrink-0">
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Reconnected to ongoing scan:</strong> You navigated back to a risk analysis that was already in progress. 
                  The scan will continue from where it left off.
                </p>
              </div>
            </div>
          </div>
        )}

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
