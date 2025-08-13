'use client';

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import { useRegion } from '@/contexts/RegionContext';
import { useState, useEffect, useCallback } from 'react';
import type { AccountInfo } from '@/types/aws';
import { 
  Building2, 
  ArrowRight, 
  Zap, 
  Shield, 
  AlertTriangle, 
  Users,
  CheckCircle,
  Globe
} from 'lucide-react';

export default function Dashboard() {
  const { awsRegion, ssoRegion } = useRegion();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalPermissionSets: 0,
    totalAccounts: 0,
    loading: true
  });

  const checkAWSConnection = useCallback(async () => {
    const response = await fetch(`/api/account?region=${encodeURIComponent(awsRegion)}`, {
      cache: 'force-cache'
    });
    const result = await response.json();
    
    if (result.success) {
      setAccountInfo(result.data);
    }
  }, [awsRegion]);

  const fetchMetrics = useCallback(async () => {
    if (!awsRegion || !ssoRegion) return;
    
    setMetrics(prev => ({ ...prev, loading: true }));
    
    try {
      // Fetch users, permission sets, and accounts in parallel
      const [usersResponse, permissionSetsResponse, accountsResponse] = await Promise.all([
        fetch(`/api/organization/users?ssoRegion=${encodeURIComponent(ssoRegion)}&region=${encodeURIComponent(awsRegion)}&page=1&limit=1`, {
          cache: 'force-cache'
        }),
        fetch(`/api/permission-sets?region=${encodeURIComponent(awsRegion)}&ssoRegion=${encodeURIComponent(ssoRegion)}`, {
          cache: 'force-cache'
        }),
        fetch(`/api/organization/accounts?region=${encodeURIComponent(awsRegion)}`, {
          cache: 'force-cache'
        })
      ]);

      const [usersData, permissionSetsData, accountsData] = await Promise.all([
        usersResponse.json(),
        permissionSetsResponse.json(),
        accountsResponse.json()
      ]);

      setMetrics({
        totalUsers: usersData.success ? (usersData.pagination?.totalCount || 0) : 0,
        totalPermissionSets: permissionSetsData.success ? (permissionSetsData.data?.length || 0) : 0,
        totalAccounts: accountsData.success ? (accountsData.data?.length || 0) : 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  }, [awsRegion, ssoRegion]);

  useEffect(() => {
    checkAWSConnection();
    fetchMetrics();
  }, [checkAWSConnection, fetchMetrics]);

  const primaryFeatures = [
    {
      title: 'Organization View',
      description: 'Comprehensive view of all users across your AWS organization with real-time access analysis.',
      icon: Building2,
      href: '/organization',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      stats: metrics.loading ? 'Loading...' : `${metrics.totalUsers} users`
    },
    {
      title: 'Permission Sets',
      description: 'Browse, analyze, and manage AWS SSO permission sets with detailed policy breakdowns.',
      icon: Shield,
      href: '/permission-sets',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      stats: metrics.loading ? 'Loading...' : `${metrics.totalPermissionSets} permission sets`
    },
    {
      title: 'Risk Analysis',
      description: 'AI-powered security analysis to identify risks, compliance violations, and optimization opportunities.',
      icon: AlertTriangle,
      href: '/risk-analysis',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      stats: metrics.loading ? 'Loading...' : 'Security insights'
    }
  ];

  return (
    <PageLayout accountInfo={accountInfo}>
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="relative">
          <PageHeader
            title="AWS IAM Simplified"
            description="Comprehensive AWS IAM management platform that simplifies user access analysis, permission management, and security compliance across your organization."
            icon={<Zap className="h-12 w-12 text-blue-600" />}
            gradientFrom="from-blue-50"
            gradientTo="to-indigo-50"
          >
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Region: {awsRegion}</span>
              </div>
              {ssoRegion && (
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">SSO: {ssoRegion}</span>
                </div>
              )}
              {accountInfo && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">
                    Connected as {accountInfo.userId} ({accountInfo.accountId})
                  </span>
                </div>
              )}
            </div>
          </PageHeader>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
                  <p className="text-sm text-gray-600">Organization-wide users</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {metrics.loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ) : (
                <div className="text-3xl font-bold text-blue-600">{metrics.totalUsers.toLocaleString()}</div>
              )}
              <p className="text-sm text-gray-500 mt-1">Active SSO users</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Permission Sets</h3>
                  <p className="text-sm text-gray-600">Configured permission sets</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {metrics.loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ) : (
                <div className="text-3xl font-bold text-green-600">{metrics.totalPermissionSets.toLocaleString()}</div>
              )}
              <p className="text-sm text-gray-500 mt-1">SSO permission sets</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building2 className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">AWS Accounts</h3>
                  <p className="text-sm text-gray-600">Organization accounts</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {metrics.loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ) : (
                <div className="text-3xl font-bold text-purple-600">{metrics.totalAccounts.toLocaleString()}</div>
              )}
              <p className="text-sm text-gray-500 mt-1">Managed accounts</p>
            </div>
          </div>
        </div>

        {/* Primary Features - Redesigned */}
        <div className="space-y-8">
          <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl">
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">AWS IAM Simplified</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Maintain security best practices while ensuring users have the access they need. 
                Our platform provides comprehensive insights into your AWS IAM configuration, 
                helping you identify risks and optimize permissions across your organization.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Real-time Analysis
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-blue-600" />
                  Security Focused
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-purple-600" />
                  Organization-wide
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {primaryFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group relative"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                    
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-16">
                      <div className={`w-full h-full rounded-full bg-gradient-to-br ${feature.color} opacity-5`} />
                    </div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 transform -translate-x-12 translate-y-12">
                      <div className={`w-full h-full rounded-full bg-gradient-to-tr ${feature.color} opacity-3`} />
                    </div>

                    <div className="relative p-8">
                      {/* Icon with enhanced styling */}
                      <div className="relative mb-6">
                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${feature.bgColor} group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                          <Icon className={`w-10 h-10 ${feature.iconColor}`} />
                        </div>
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                      </div>

                      {/* Content */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                            {feature.title}
                          </h3>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {feature.description}
                          </p>
                        </div>

                        {/* Stats Badge */}
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${feature.bgColor} ${feature.iconColor} border border-current border-opacity-20`}>
                          {feature.stats}
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                            Explore {feature.title}
                          </span>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-600 transition-all duration-300">
                            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
