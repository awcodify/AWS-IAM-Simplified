'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, CheckCircle2, Globe, User } from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';
import { useAccountInfo } from '@/hooks/useAccountInfo';
import { AWS_REGIONS } from '@/constants/regions';

// Header component with no external props needed
// Available for header customization if needed

export default function Header() {
  const { awsRegion, identityCenterRegion, setAwsRegion } = useRegion();
  const { accountInfo } = useAccountInfo();
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
    <div className="bg-white shadow border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand Section */}
          <div className="flex items-center space-x-4">
            {/* Gradient Logo Container */}
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AWS IAM Simplified</h1>
              <p className="text-gray-600 text-sm">Simplified IAM management and permission tracking</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Account Info */}
            {accountInfo && (
              <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    {accountInfo.userId?.split(':')[1] || accountInfo.userId}
                  </span>
                </div>
                {accountInfo.accountName && (
                  <>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="text-sm font-medium text-gray-900">{accountInfo.accountName}</span>
                  </>
                )}
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-sm text-gray-600">{accountInfo.accountId}</span>
              </div>
            )}

            {/* Region Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-0 shadow-sm"
                title={`AWS Region: ${getCurrentRegionLabel()}`}
              >
                <Globe className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                <span className="hidden sm:inline mr-2 flex-shrink-0">AWS:</span>
                <span className="truncate max-w-24 sm:max-w-32 font-semibold">{awsRegion}</span>
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{identityCenterRegion}</span>
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
                  {identityCenterRegion !== awsRegion && (
                    <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
                      <div className="text-xs text-yellow-800">
                        <strong>Note:</strong> Your AWS and Identity Center regions differ. This is normal if your Identity Center is configured in a different region.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
