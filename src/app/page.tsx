'use client';

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { useRegion } from '@/contexts/RegionContext';
import { usePermissionSets } from '@/hooks/usePermissionSets';
import { useOrganizationAccounts } from '@/hooks/useOrganizationAccounts';
import { useState, useEffect, useCallback } from 'react';
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
      cache: 'no-store'
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
    <PageLayout>
      <div className="space-y-8">
        {/* Hero Section with Integrated Metrics */}
        <div className="relative overflow-hidden min-h-screen flex items-center">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
          </div>
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000" />
          <div className="absolute -bottom-32 left-1/2 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
            {/* Main Content */}
            <div className="text-center mb-16">
              {/* Main Headline */}
              <div className="mb-8">
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    AWS IAM
                  </span>
                  <br />
                  <span className="text-gray-900">Simplified</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  Transform complex AWS IAM management into simple, intuitive workflows. 
                  Analyze permissions, manage access, and ensure security compliance with ease.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3 text-sm mb-12">
                {[
                  { icon: Zap, text: "Real-time Analysis", color: "bg-yellow-100 text-yellow-700" },
                  { icon: Shield, text: "Security Focused", color: "bg-green-100 text-green-700" },
                  { icon: Globe, text: "Multi-Account Support", color: "bg-blue-100 text-blue-700" },
                  { icon: CheckCircle, text: "Compliance Ready", color: "bg-purple-100 text-purple-700" }
                ].map((pill, index) => {
                  const Icon = pill.icon;
                  return (
                    <div key={index} className={`inline-flex items-center px-4 py-2 rounded-full ${pill.color} font-medium`}>
                      <Icon className="w-4 h-4 mr-2" />
                      {pill.text}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Highlighted Metrics Cards - Moved Up */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Your AWS Environment Overview</h2>
                <p className="text-gray-600 text-lg">Real-time insights into your organization&apos;s IAM landscape</p>
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
            </div>

            {/* CTA Buttons - Moved Down */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/organization"
                className="group inline-flex items-center px-8 py-4 text-lg font-semibold rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <Users className="w-5 h-5 mr-2" />
                Explore Organization
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              
              <Link
                href="/risk-analysis"
                className="group inline-flex items-center px-8 py-4 text-lg font-semibold rounded-2xl border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all duration-300"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Risk Analysis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
