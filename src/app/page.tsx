'use client';

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import AuthGuard from '@/components/AuthGuard';
import { useRegion } from '@/contexts/RegionContext';
import { usePermissionSets } from '@/hooks/usePermissionSets';
import { useOrganizationAccounts } from '@/hooks/useOrganizationAccounts';
import { createAuthHeaders } from '@/lib/credentials';
import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  ArrowRight, 
  Shield, 
  AlertTriangle, 
  Users
} from 'lucide-react';

export default function Dashboard() {
  const { awsRegion, ssoRegion } = useRegion();
  const { permissionSets } = usePermissionSets();
  const { accounts } = useOrganizationAccounts();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalPermissionSets: 0,
    totalAccounts: 0,
    loading: true
  });

  const fetchMetrics = useCallback(async () => {
    if (!awsRegion || !ssoRegion) {
      setMetrics(prev => ({ ...prev, loading: false }));
      return;
    }
    
    setMetrics(prev => ({ ...prev, loading: true }));
    
    // Only fetch users count (permission sets and accounts come from hooks)
    const usersResponse = await fetch(`/api/organization/users?ssoRegion=${encodeURIComponent(ssoRegion)}&region=${encodeURIComponent(awsRegion)}&page=1&limit=1&ssoOnly=false`, {
      cache: 'no-store',
      headers: createAuthHeaders()
    });

    const usersData = await usersResponse.json();

    setMetrics({
      totalUsers: usersData.success ? (usersData.pagination?.totalUsers || usersData.data?.length || 0) : 0,
      totalPermissionSets: permissionSets.length,
      totalAccounts: accounts.length,
      loading: false
    });
  }, [awsRegion, ssoRegion, permissionSets.length, accounts.length]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <AuthGuard>
      <PageLayout>
        <div className="space-y-8">
          {/* Dashboard Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">AWS IAM Simplified</h1>
                <p className="text-gray-600 text-lg">Overview of your organization&apos;s IAM landscape</p>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: Users,
                  title: "Organization Users",
                  value: metrics.totalUsers,
                  description: "Active users across your organization",
                  gradient: "from-blue-500 to-cyan-500",
                  bgGradient: "from-blue-50 to-cyan-50",
                  link: "/organization"
                },
                {
                  icon: Shield,
                  title: "Permission Sets",
                  value: metrics.totalPermissionSets,
                  description: "Configured permission sets",
                  gradient: "from-emerald-500 to-teal-500",
                  bgGradient: "from-emerald-50 to-teal-50",
                  link: "/permission-sets"
                },
                {
                  icon: Building2,
                  title: "AWS Accounts",
                  value: metrics.totalAccounts,
                  description: "Managed accounts in organization",
                  gradient: "from-purple-500 to-indigo-500",
                  bgGradient: "from-purple-50 to-indigo-50",
                  link: "/organization"
                }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Link key={index} href={stat.link} className="group relative block">
                    <div className={`absolute inset-0 bg-gradient-to-r ${stat.bgGradient} rounded-3xl transform group-hover:scale-105 transition-all duration-300 shadow-lg group-hover:shadow-2xl`} />
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/30 shadow-xl group-hover:bg-white/90 transition-all duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-right">
                          {metrics.loading ? (
                            <div className="animate-pulse">
                              <div className="h-10 bg-gray-200 rounded w-20 ml-auto"></div>
                            </div>
                          ) : (
                            <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300`}>
                              {stat.value.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-gray-800">{stat.title}</h3>
                        <p className="text-gray-600 group-hover:text-gray-700">{stat.description}</p>
                        <div className="mt-4 flex items-center text-sm font-medium text-gray-500 group-hover:text-gray-700">
                          <span>View details</span>
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                  href="/organization"
                  className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-300">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">Manage Users</h3>
                      <p className="text-gray-600">View and manage organization users</p>
                    </div>
                    <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </Link>

                <Link
                  href="/risk-analysis"
                  className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors duration-300">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600">Risk Analysis</h3>
                      <p className="text-gray-600">Analyze security risks and compliance</p>
                    </div>
                    <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    </AuthGuard>
  );
}