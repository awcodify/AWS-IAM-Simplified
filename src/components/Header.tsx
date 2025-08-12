'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, CheckCircle2, Globe } from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';

interface HeaderProps {
  accountInfo?: {
    accountId: string;
    arn?: string;
    userId?: string;
  } | null;
}

interface RegionOption {
  value: string;
  label: string;
}

const AWS_REGIONS: RegionOption[] = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-west-3', label: 'Europe (Paris)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'eu-north-1', label: 'Europe (Stockholm)' },
  { value: 'eu-south-1', label: 'Europe (Milan)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
  { value: 'af-south-1', label: 'Africa (Cape Town)' },
  { value: 'me-south-1', label: 'Middle East (Bahrain)' },
];

export default function Header({ accountInfo }: HeaderProps) {
  const { awsRegion, ssoRegion, setAwsRegion } = useRegion();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRegionChange = (newRegion: string) => {
    setAwsRegion(newRegion);
    setIsDropdownOpen(false);
  };

  const getCurrentRegionLabel = () => {
    const region = AWS_REGIONS.find(r => r.value === awsRegion);
    return region ? region.label : awsRegion;
  };

  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AWS IAM Dashboard</h1>
            <p className="text-gray-600 mt-1">Simplified IAM management and permission tracking</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Region Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-0"
                title={`AWS Region: ${getCurrentRegionLabel()}`}
              >
                <Building2 className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
                <span className="hidden sm:inline mr-2 flex-shrink-0">AWS:</span>
                <span className="truncate max-w-24 sm:max-w-32">{awsRegion}</span>
                <ChevronDown className={`w-3 h-3 ml-2 flex-shrink-0 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="py-2">
                    {/* Current Settings Header */}
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <div className="text-xs font-medium text-gray-900 mb-1">Current Settings</div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>AWS Operations:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">{awsRegion}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                        <span>Identity Center:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{ssoRegion}</span>
                      </div>
                    </div>

                    {/* Region Options */}
                    {AWS_REGIONS.map((region) => (
                      <button
                        key={region.value}
                        onClick={() => handleRegionChange(region.value)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                          region.value === awsRegion ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-900'
                        }`}
                      >
                        <div className="flex items-center">
                          <Globe className="w-3 h-3 mr-2 text-gray-400" />
                          <div>
                            <div className="font-medium">{region.value}</div>
                            <div className="text-xs text-gray-500">{region.label}</div>
                          </div>
                        </div>
                        {region.value === awsRegion && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Information Footer */}
                  {ssoRegion !== awsRegion && (
                    <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
                      <div className="text-xs text-yellow-800">
                        <strong>Note:</strong> Your AWS and Identity Center regions differ. This is normal if your Identity Center is configured in a different region.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account Info */}
            {accountInfo && (
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                <span className="hidden sm:inline mr-1">Account:</span>
                {accountInfo.accountId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
