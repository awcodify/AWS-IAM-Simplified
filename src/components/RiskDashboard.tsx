'use client';

import React, { useState, useMemo } from 'react';
import { Shield, AlertTriangle, Users, TrendingUp, TrendingDown, Eye, Filter, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { UserRiskProfile, RiskFinding, RiskLevel, RiskCategory } from '@/types/risk-analysis';
import Link from 'next/link';

interface RiskDashboardProps {
  userRiskProfiles: UserRiskProfile[];
  loading?: boolean;
}

const RiskLevelBadge = ({ level, count }: { level: RiskLevel; count?: number }) => {
  const config = {
    'CRITICAL': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    'HIGH': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    'MEDIUM': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    'LOW': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    'INFO': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
  };

  const { bg, text, border } = config[level];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg} ${text} ${border}`}>
      {level}
      {count !== undefined && ` (${count})`}
    </span>
  );
};

const RiskCategoryIcon = ({ category }: { category: RiskCategory }) => {
  const iconMap = {
    'OVERLY_PERMISSIVE': '🔓',
    'PRIVILEGE_ESCALATION': '⬆️',
    'DATA_EXPOSURE': '💾',
    'SECURITY_MISCONFIGURATION': '⚙️',
    'COMPLIANCE_VIOLATION': '📋',
    'UNUSED_PERMISSIONS': '🗑️',
    'ADMINISTRATIVE_ACCESS': '👑',
    'CROSS_ACCOUNT_ACCESS': '🔗',
    'SERVICE_SPECIFIC': '🔧'
  };

  return <span className="text-lg">{iconMap[category] || '❓'}</span>;
};

export default function RiskDashboard({ userRiskProfiles, loading = false }: RiskDashboardProps) {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<RiskCategory | 'ALL'>('ALL');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const totalUsers = userRiskProfiles.length;
    const allFindings = userRiskProfiles.flatMap(profile => profile.findings);
    
    const criticalFindings = allFindings.filter(f => f.riskLevel === 'CRITICAL').length;
    const highRiskUsers = userRiskProfiles.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH').length;
    const adminUsers = userRiskProfiles.filter(p => p.adminAccess).length;
    const crossAccountUsers = userRiskProfiles.filter(p => p.crossAccountAccess).length;

    const findingsByCategory: Record<RiskCategory, number> = {
      'OVERLY_PERMISSIVE': 0,
      'PRIVILEGE_ESCALATION': 0,
      'DATA_EXPOSURE': 0,
      'SECURITY_MISCONFIGURATION': 0,
      'COMPLIANCE_VIOLATION': 0,
      'UNUSED_PERMISSIONS': 0,
      'ADMINISTRATIVE_ACCESS': 0,
      'CROSS_ACCOUNT_ACCESS': 0,
      'SERVICE_SPECIFIC': 0
    };

    const findingsByRiskLevel: Record<RiskLevel, number> = {
      'CRITICAL': 0,
      'HIGH': 0,
      'MEDIUM': 0,
      'LOW': 0,
      'INFO': 0
    };

    allFindings.forEach(finding => {
      findingsByCategory[finding.category]++;
      findingsByRiskLevel[finding.riskLevel]++;
    });

    return {
      totalUsers,
      criticalFindings,
      highRiskUsers,
      adminUsers,
      crossAccountUsers,
      findingsByCategory,
      findingsByRiskLevel,
      totalFindings: allFindings.length
    };
  }, [userRiskProfiles]);

  // Filter users based on selected criteria
  const filteredUsers = useMemo(() => {
    return userRiskProfiles.filter(profile => {
      if (selectedRiskLevel !== 'ALL' && profile.riskLevel !== selectedRiskLevel) {
        return false;
      }
      
      if (selectedCategory !== 'ALL') {
        const hasCategory = profile.findings.some(finding => finding.category === selectedCategory);
        if (!hasCategory) return false;
      }
      
      return true;
    });
  }, [userRiskProfiles, selectedRiskLevel, selectedCategory]);

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleFindingExpansion = (findingId: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(findingId)) {
      newExpanded.delete(findingId);
    } else {
      newExpanded.add(findingId);
    }
    setExpandedFindings(newExpanded);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-red-600" />
            IAM Risk Analysis Dashboard
          </h2>
          <div className="text-sm text-gray-600">
            Last analyzed: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-600">Critical Findings</p>
                <p className="text-2xl font-bold text-red-900">{dashboardMetrics.criticalFindings}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-600">High Risk Users</p>
                <p className="text-2xl font-bold text-orange-900">{dashboardMetrics.highRiskUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Admin Users</p>
                <p className="text-2xl font-bold text-purple-900">{dashboardMetrics.adminUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Cross-Account Users</p>
                <p className="text-2xl font-bold text-blue-900">{dashboardMetrics.crossAccountUsers}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
            <select
              value={selectedRiskLevel}
              onChange={(e) => setSelectedRiskLevel(e.target.value as RiskLevel | 'ALL')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as RiskCategory | 'ALL')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="OVERLY_PERMISSIVE">Overly Permissive</option>
              <option value="PRIVILEGE_ESCALATION">Privilege Escalation</option>
              <option value="DATA_EXPOSURE">Data Exposure</option>
              <option value="ADMINISTRATIVE_ACCESS">Administrative Access</option>
              <option value="CROSS_ACCOUNT_ACCESS">Cross-Account Access</option>
              <option value="SECURITY_MISCONFIGURATION">Security Misconfiguration</option>
              <option value="COMPLIANCE_VIOLATION">Compliance Violation</option>
              <option value="UNUSED_PERMISSIONS">Unused Permissions</option>
              <option value="SERVICE_SPECIFIC">Service Specific</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {dashboardMetrics.totalUsers} users
            </div>
          </div>
        </div>
      </div>

      {/* Risk Summary by Category */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Findings by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(dashboardMetrics.findingsByCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <RiskCategoryIcon category={category as RiskCategory} />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Risk Profiles */}
      <div className="divide-y divide-gray-200">
        {filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No users match the selected criteria.
          </div>
        ) : (
          filteredUsers.map((profile) => (
            <div key={profile.userId} className="p-6">
              {/* User Header */}
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                onClick={() => toggleUserExpansion(profile.userId)}
              >
                <div className="flex items-center space-x-3">
                  {expandedUsers.has(profile.userId) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {profile.displayName || profile.userName}
                    </h4>
                    <p className="text-sm text-gray-500">{profile.userName}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Risk Score:</span>
                    <span className="text-lg font-bold text-gray-900">{profile.overallRiskScore}/10</span>
                  </div>
                  
                  <RiskLevelBadge level={profile.riskLevel} />
                  
                  <div className="flex items-center space-x-1">
                    {profile.adminAccess && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Admin
                      </span>
                    )}
                    {profile.crossAccountAccess && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Cross-Account
                      </span>
                    )}
                  </div>

                  <span className="text-sm text-gray-500">
                    {profile.findings.length} finding{profile.findings.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Expanded User Details */}
              {expandedUsers.has(profile.userId) && (
                <div className="mt-4 ml-8 space-y-4">
                  {/* User Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{profile.accountAccess.length}</div>
                      <div className="text-sm text-gray-600">Accounts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{profile.totalPermissionSets}</div>
                      <div className="text-sm text-gray-600">Permission Sets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{profile.findings.length}</div>
                      <div className="text-sm text-gray-600">Total Findings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {profile.findings.filter(f => f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH').length}
                      </div>
                      <div className="text-sm text-gray-600">High/Critical</div>
                    </div>
                  </div>

                  {/* Findings */}
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-3">Risk Findings</h5>
                    <div className="space-y-2">
                      {profile.findings.map((finding) => (
                        <div key={finding.id} className="border border-gray-200 rounded-lg">
                          <div 
                            className="p-3 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleFindingExpansion(finding.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {expandedFindings.has(finding.id) ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                
                                <RiskCategoryIcon category={finding.category} />
                                
                                <div>
                                  <h6 className="text-sm font-medium text-gray-900">{finding.title}</h6>
                                  <p className="text-xs text-gray-500">{finding.description}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Severity: {finding.severity}/10</span>
                                <RiskLevelBadge level={finding.riskLevel} />
                              </div>
                            </div>
                          </div>

                          {expandedFindings.has(finding.id) && (
                            <div className="px-6 pb-3 border-t border-gray-100">
                              <div className="mt-3 space-y-3">
                                <div>
                                  <h6 className="text-xs font-medium text-gray-900 uppercase tracking-wide">Impact</h6>
                                  <p className="text-sm text-gray-700 mt-1">{finding.impact}</p>
                                </div>
                                
                                <div>
                                  <h6 className="text-xs font-medium text-gray-900 uppercase tracking-wide">Recommendation</h6>
                                  <p className="text-sm text-gray-700 mt-1">{finding.recommendation}</p>
                                </div>

                                {finding.resourceArn && (
                                  <div>
                                    <h6 className="text-xs font-medium text-gray-900 uppercase tracking-wide">Resource</h6>
                                    <div className="text-sm text-gray-700 mt-1 flex items-center">
                                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                        {finding.resourceName || finding.resourceArn}
                                      </span>
                                      {finding.resourceType === 'PERMISSION_SET' && (
                                        <Link
                                          href={`/permission-sets/${encodeURIComponent(finding.resourceArn)}`}
                                          className="ml-2 text-blue-600 hover:text-blue-800"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <div className="text-xs text-gray-500">
                                  Found: {finding.createdAt.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
