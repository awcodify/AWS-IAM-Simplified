'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader2, Search, Users, FileText, Clock } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import PageHeader from '@/components/PageHeader';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useRegion } from '@/contexts/RegionContext';

interface PermissionSet {
  arn: string;
  name: string;
  description?: string;
}

export default function PermissionSetsPage() {
  const { awsRegion, ssoRegion } = useRegion();
  const [permissionSets, setPermissionSets] = useState<PermissionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPermissionSets = async () => {
      if (!awsRegion || !ssoRegion) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        region: awsRegion,
        ssoRegion: ssoRegion
      });

      const response = await fetch(`/api/permission-sets?${params}`, {
        cache: 'force-cache'
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch permission sets');
        setLoading(false);
        return;
      }

      setPermissionSets(result.data);
      setLoading(false);
    };

    fetchPermissionSets();
  }, [awsRegion, ssoRegion]);

  const filteredPermissionSets = permissionSets.filter(ps =>
    ps.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ps.description && ps.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <PageLayout>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <PageHeader
            title="Permission Sets"
            description="Manage and view AWS SSO permission sets"
            icon={<Shield className="h-12 w-12 text-blue-600" />}
            gradientFrom="from-blue-50"
            gradientTo="to-blue-50"
          />
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading permission sets...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <PageHeader
            title="Permission Sets"
            description="Manage and view AWS SSO permission sets"
            icon={<Shield className="h-12 w-12 text-blue-600" />}
            gradientFrom="from-blue-50"
            gradientTo="to-blue-50"
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
          title="Permission Sets"
          description="Manage and view AWS SSO permission sets"
          icon={<Shield className="h-12 w-12 text-blue-600" />}
          gradientFrom="from-blue-50"
          gradientTo="to-blue-50"
        >
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              {filteredPermissionSets.length} of {permissionSets.length} permission sets
            </div>
          </div>
        </PageHeader>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search permission sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Permission Sets Content */}
        <div className="p-6">
          {/* Permission Sets Grid */}
          {filteredPermissionSets.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching permission sets' : 'No permission sets found'}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search criteria.' 
                  : 'There are no permission sets configured in this AWS SSO instance.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPermissionSets.map((permissionSet) => (
                <PermissionSetCard 
                  key={permissionSet.arn} 
                  permissionSet={permissionSet} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

interface PermissionSetCardProps {
  permissionSet: PermissionSet;
}

function PermissionSetCard({ permissionSet }: PermissionSetCardProps) {
  const getPermissionSetId = (arn: string) => {
    const parts = arn.split('/');
    return parts[parts.length - 1] || 'unknown';
  };

  const permissionSetUrl = `/permission-sets/${encodeURIComponent(permissionSet.arn)}`;

  return (
    <Link href={permissionSetUrl} className="block h-full">
      <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-300 cursor-pointer h-full flex flex-col min-h-[200px]">
        {/* Header */}
        <div className="flex items-start mb-4">
          <div className="bg-blue-100 rounded-lg p-2 mr-3 flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {permissionSet.name || getPermissionSetId(permissionSet.arn)}
            </h3>
          </div>
        </div>
        
        {/* Description */}
        <div className="flex-1 mb-4">
          {permissionSet.description ? (
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
              {permissionSet.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No description available
            </p>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-100 pt-3 mt-auto">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center text-gray-500">
              <FileText className="w-3 h-3 mr-1" />
              <span>Permission Set</span>
            </div>
            <div className="text-blue-600 font-medium hover:text-blue-800 flex items-center">
              <span className="mr-1">View Details</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
