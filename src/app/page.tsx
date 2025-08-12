'use client';

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import { useRegion } from '@/contexts/RegionContext';
import { useState, useEffect, useCallback } from 'react';
import type { AccountInfo } from '@/types/aws';
import { Users, Building2, ArrowRight, Zap } from 'lucide-react';

export default function Dashboard() {
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

  const dashboardCards = [
    {
      title: 'Single Account View',
      description: 'View and manage IAM users within a single AWS account. Analyze permissions and access patterns for individual users.',
      icon: Users,
      href: '/single-account',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'Organization View',
      description: 'View and manage users across multiple accounts in your AWS organization. Get a comprehensive overview of cross-account access.',
      icon: Building2,
      href: '/organization',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    }
  ];

  return (
    <PageLayout accountInfo={accountInfo}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <PageHeader
          title="AWS IAM Simplified"
          description="Simplify AWS IAM management and understand what resources your users can access. Choose a view below to get started with analyzing user permissions and access patterns."
          icon={<Zap className="h-12 w-12 text-blue-600" />}
          accountInfo={accountInfo}
        />

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-lg ${card.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                        {card.title}
                      </h3>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Choose Your View</h3>
              <p className="text-sm text-gray-600">
                Select Single Account for individual account analysis or Organization for multi-account overview.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <span className="text-green-600 font-semibold">2</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Select a User</h3>
              <p className="text-sm text-gray-600">
                Browse the user list and select any user to analyze their permissions and access patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
