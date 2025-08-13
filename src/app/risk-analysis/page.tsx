'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import RiskDashboard from '@/components/RiskDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useRegion } from '@/contexts/RegionContext';
import type { OrganizationUser } from '@/types/aws';
import type { UserRiskProfile } from '@/types/risk-analysis';

export default function RiskAnalysisPage() {
  const { awsRegion, ssoRegion } = useRegion();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [userRiskProfiles, setUserRiskProfiles] = useState<UserRiskProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskAnalysisLoading, setRiskAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch permission sets for analysis
  useEffect(() => {
    const fetchPermissionSets = async () => {
      setLoading(true);
      setError(null);

      // Fetch permission sets directly instead of users
      const response = await fetch(`/api/permission-sets?region=${encodeURIComponent(awsRegion)}&ssoRegion=${encodeURIComponent(ssoRegion)}`);
      
      if (!response.ok) {
        setError(`Failed to fetch permission sets: ${response.statusText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUsers(data.data || []); // API returns permission sets in data.data
      setLoading(false);
    };

    fetchPermissionSets().catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to fetch permission sets');
      setLoading(false);
    });
  }, [ssoRegion]);

  // Perform risk analysis on permission sets
  const performRiskAnalysis = async () => {
    if (users.length === 0) return;

    setRiskAnalysisLoading(true);
    setError(null);

    const response = await fetch('/api/risk-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        permissionSets: users, // Pass permission sets instead of users
        region: awsRegion,
        ssoRegion: ssoRegion,
        analysisType: 'permission-sets' // Flag to indicate we're analyzing permission sets
      }),
    });

    if (!response.ok) {
      setError(`Risk analysis failed: ${response.statusText}`);
      setRiskAnalysisLoading(false);
      return;
    }

    const data = await response.json();
    setUserRiskProfiles(data.permissionSetRiskProfiles || []); // Rename but reuse the same state
    setRiskAnalysisLoading(false);
  };

  // Auto-start risk analysis when permission sets are loaded
  useEffect(() => {
    if (users.length > 0 && userRiskProfiles.length === 0) {
      performRiskAnalysis().catch(err => {
        setError(err instanceof Error ? err.message : 'Risk analysis failed');
        setRiskAnalysisLoading(false);
      });
    }
  }, [users]);

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          title="IAM Risk Analysis"
          description="Comprehensive security risk assessment for IAM permission sets"
          icon={<Shield className="h-12 w-12 text-red-600" />}
        />
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (error && users.length === 0) {
    return (
      <PageLayout>
        <PageHeader
          title="IAM Risk Analysis"
          description="Comprehensive security risk assessment for IAM permission sets"
          icon={<AlertTriangle className="h-12 w-12 text-red-600" />}
        />
        <ErrorDisplay 
          message={error}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="IAM Risk Analysis"
        description="Comprehensive security risk assessment for IAM permission sets"
        icon={<Shield className="h-12 w-12 text-red-600" />}
      >
        <div className="flex items-center space-x-4">
          <Link
            href="/permission-sets"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Permission Sets
          </Link>
          
          {users.length > 0 && (
            <button
              onClick={() => performRiskAnalysis().catch(err => {
                setError(err instanceof Error ? err.message : 'Risk analysis failed');
                setRiskAnalysisLoading(false);
              })}
              disabled={riskAnalysisLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"
            >
              {riskAnalysisLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Re-analyze Risks
                </>
              )}
            </button>
          )}
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Risk Analysis Status */}
        {riskAnalysisLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 gap-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <div>
                <h3 className="text-lg font-medium text-blue-900">Analyzing Security Risks</h3>
                <p className="text-blue-700">
                  Evaluating {users.length} permission sets across organization accounts...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && userRiskProfiles.length === 0 && (
          <ErrorDisplay 
            message={error}
            onRetry={() => performRiskAnalysis().catch(err => {
              setError(err instanceof Error ? err.message : 'Risk analysis failed');
              setRiskAnalysisLoading(false);
            })}
          />
        )}

        {/* Risk Dashboard */}
        {userRiskProfiles.length > 0 && (
          <RiskDashboard 
            userRiskProfiles={userRiskProfiles}
            loading={riskAnalysisLoading}
          />
        )}

        {/* No Data State */}
        {!loading && !riskAnalysisLoading && users.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No permission sets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Make sure you have access to the organization and permission sets are configured.
            </p>
            <div className="mt-6">
              <Link
                href="/permission-sets"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                View Permission Sets
              </Link>
            </div>
          </div>
        )}

        {/* Analysis Info */}
        {userRiskProfiles.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">About This Analysis</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Evaluates permission sets for overly permissive access patterns</p>
              <p>• Identifies potential privilege escalation risks</p>
              <p>• Detects cross-account access and administrative privileges</p>
              <p>• Analyzes AWS managed policies for security implications</p>
              <p>• Provides actionable recommendations for risk mitigation</p>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Last analyzed: {new Date().toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
