'use client';

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import AuthGuard from '@/components/AuthGuard';
import AccountTypeIndicator from '@/components/AccountTypeIndicator';
import { useRegion } from '@/contexts/RegionContext';
import { usePermissionSets } from '@/hooks/usePermissionSets';
import { useOrganizationAccounts } from '@/hooks/useOrganizationAccounts';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { createAuthHeaders } from '@/lib/credentials';
import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  ArrowRight, 
  Shield, 
  AlertTriangle, 
  Users,
  Lock,
  Info
} from 'lucide-react';

export default function Dashboard() {
  const { awsRegion, identityCenterRegion } = useRegion();
  const { permissionSets } = usePermissionSets();
  const { accounts } = useOrganizationAccounts();
  const capabilities = useAccountCapabilities(awsRegion, identityCenterRegion);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalPermissionSets: 0,
    totalAccounts: 0,
    loading: true
  });

  const fetchMetrics = useCallback(async () => {
    if (!awsRegion || !identityCenterRegion) {
      setMetrics(prev => ({ ...prev, loading: false }));
      return;
    }
    
    setMetrics(prev => ({ ...prev, loading: true }));
    
    // Only fetch users count (permission sets and accounts come from hooks)
    const usersResponse = await fetch(`/api/organization/users?ssoRegion=${encodeURIComponent(identityCenterRegion)}&region=${encodeURIComponent(awsRegion)}&page=1&limit=1&ssoOnly=false`, {
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
  }, [awsRegion, identityCenterRegion, permissionSets.length, accounts.length]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <AuthGuard>
      <PageLayout>
        <div className="space-y-8">
          {/* Account Capability Indicators */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AccountTypeIndicator
                type="management"
                hasAccess={capabilities.hasManagementAccess}
                isChecking={capabilities.isChecking}
                error={capabilities.managementError}
              />
              <AccountTypeIndicator
                type="iam"
                hasAccess={capabilities.hasIAMAccess}
                isChecking={capabilities.isChecking}
              />
            </div>
          </div>

          {/* Management Account Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Management Account Features</h2>
                  <p className="text-sm text-gray-600">Organization-wide resources and Identity Center (SSO)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: Users,
                  title: "Organization Users",
                  value: metrics.totalUsers,
                  description: "Active users across your organization",
                  gradient: "from-blue-500 to-cyan-500",
                  bgGradient: "from-blue-50 to-cyan-50",
                  link: "/accounts/management"
                },
                {
                  icon: Building2,
                  title: "AWS Accounts",
                  value: metrics.totalAccounts,
                  description: "Managed accounts in organization",
                  gradient: "from-purple-500 to-indigo-500",
                  bgGradient: "from-purple-50 to-indigo-50",
                  link: "/accounts/management"
                },
                {
                  icon: Shield,
                  title: "Permission Sets",
                  value: metrics.totalPermissionSets,
                  description: "Identity Center permission sets",
                  gradient: "from-emerald-500 to-teal-500",
                  bgGradient: "from-emerald-50 to-teal-50",
                  link: "/permission-sets"
                }
              ].map((stat, index) => {
                const Icon = stat.icon;
                const isDisabled = !capabilities.hasManagementAccess;
                const isLoading = capabilities.isChecking || metrics.loading;

                if (isDisabled) {
                  return (
                    <div key={index} className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${stat.bgGradient} rounded-3xl opacity-50 shadow-lg`} />
                      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/30 shadow-xl">
                        <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>Restricted</span>
                        </div>
                        <div className="flex items-center justify-between mb-6 opacity-50">
                          <div className={`p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} shadow-lg`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <div className="text-right">
                            <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                              —
                            </div>
                          </div>
                        </div>
                        <div className="opacity-50">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{stat.title}</h3>
                          <p className="text-gray-600">{stat.description}</p>
                        </div>
                        <div className="mt-4 flex items-center text-sm font-medium text-amber-700">
                          <Info className="w-4 h-4 mr-1" />
                          <span>Requires Management Account</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link key={index} href={stat.link} className="group relative block">
                    <div className={`absolute inset-0 bg-gradient-to-r ${stat.bgGradient} rounded-3xl transform group-hover:scale-105 transition-all duration-300 shadow-lg group-hover:shadow-2xl`} />
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/30 shadow-xl group-hover:bg-white/90 transition-all duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-right">
                          {isLoading ? (
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
          </div>

          {/* IAM (Current Account) Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">IAM (Current Account)</h2>
                  <p className="text-sm text-gray-600">Local IAM users, roles, and policies</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {([
                {
                  icon: Users,
                  title: "IAM Users",
                  value: "—" as const,
                  description: "Local IAM users in this account",
                  gradient: "from-emerald-500 to-teal-500",
                  bgGradient: "from-emerald-50 to-teal-50",
                  link: "/accounts/iam"
                },
                {
                  icon: AlertTriangle,
                  title: "IAM Roles",
                  value: "—" as const,
                  description: "Roles and trust policies",
                  gradient: "from-purple-500 to-indigo-500",
                  bgGradient: "from-purple-50 to-indigo-50",
                  link: "/accounts/iam"
                }
              ] as Array<{
                icon: typeof Users | typeof AlertTriangle;
                title: string;
                value: string | number;
                description: string;
                gradient: string;
                bgGradient: string;
                link: string;
              }>).map((stat, index) => {
                const Icon = stat.icon;
                const isDisabled = !capabilities.hasIAMAccess;
                const isLoading = capabilities.isChecking || metrics.loading;

                if (isDisabled) {
                  return (
                    <div key={index} className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${stat.bgGradient} rounded-3xl opacity-50 shadow-lg`} />
                      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/30 shadow-xl">
                        <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>Restricted</span>
                        </div>
                        <div className="flex items-center justify-between mb-6 opacity-50">
                          <div className={`p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} shadow-lg`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <div className="text-right">
                            <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                              —
                            </div>
                          </div>
                        </div>
                        <div className="opacity-50">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{stat.title}</h3>
                          <p className="text-gray-600">{stat.description}</p>
                        </div>
                        <div className="mt-4 flex items-center text-sm font-medium text-amber-700">
                          <Info className="w-4 h-4 mr-1" />
                          <span>Requires Identity Center Account</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link key={index} href={stat.link} className="group relative block">
                    <div className={`absolute inset-0 bg-gradient-to-r ${stat.bgGradient} rounded-3xl transform group-hover:scale-105 transition-all duration-300 shadow-lg group-hover:shadow-2xl`} />
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/30 shadow-xl group-hover:bg-white/90 transition-all duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-right">
                          {isLoading && typeof stat.value === 'number' ? (
                            <div className="animate-pulse">
                              <div className="h-10 bg-gray-200 rounded w-20 ml-auto"></div>
                            </div>
                          ) : (
                            <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300`}>
                              {stat.value === "—" ? stat.value : typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
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
          </div>

          {/* Quick Actions */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Management Account */}
              {capabilities.hasManagementAccess ? (
                <Link
                  href="/accounts/management"
                  className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-300">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">Management Account</h3>
                      <p className="text-gray-600">Organization and Identity Center</p>
                    </div>
                    <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </Link>
              ) : (
                <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 opacity-60 cursor-not-allowed">
                  <div className="flex items-center">
                    <div className="p-3 bg-gray-200 rounded-lg">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-500">Management Account</h3>
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">Requires Management Account</p>
                    </div>
                  </div>
                </div>
              )}

              {/* IAM (Current Account) */}
              <Link
                href="/accounts/iam"
                className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors duration-300">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600">IAM (Current Account)</h3>
                    <p className="text-gray-600">Local users, roles, and policies</p>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    </AuthGuard>
  );
}