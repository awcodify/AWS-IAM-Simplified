'use client';

import { useState } from 'react';
import { Building2, Settings, CheckCircle2, X } from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';
import RegionSelector from './RegionSelector';

interface HeaderProps {
  accountInfo?: {
    accountId: string;
    arn?: string;
    userId?: string;
  } | null;
}

export default function Header({ accountInfo }: HeaderProps) {
  const { awsRegion, ssoRegion, setAwsRegion } = useRegion();
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AWS IAM Dashboard</h1>
              <p className="text-gray-600 mt-1">Simplified IAM management and permission tracking</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Region Selector */}
              <button
                onClick={() => setIsRegionModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Region Settings"
              >
                <Building2 className="w-4 h-4 mr-2 text-green-600" />
                <span className="hidden sm:inline mr-2">AWS:</span>
                {awsRegion}
                <Settings className="w-3 h-3 ml-2 text-gray-400" />
              </button>

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

      {/* Region Settings Modal */}
      {isRegionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsRegionModalOpen(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => setIsRegionModalOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Region Settings
                  </h3>
                  
                  <div className="space-y-4">
                    {/* AWS Region Selector */}
                    <RegionSelector
                      label="AWS Region"
                      value={awsRegion}
                      onChange={setAwsRegion}
                      icon={<Building2 className="w-4 h-4 text-green-600 mr-2" />}
                      description="Primary AWS region for operations"
                      colorScheme="green"
                    />

                    {/* SSO Region Display (Read-only) */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Settings className="w-4 h-4 text-blue-600 mr-2" />
                        <label className="block text-sm font-medium text-blue-800">
                          IAM Identity Center Region
                        </label>
                      </div>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
                        {ssoRegion}
                      </div>
                      <p className="mt-1 text-xs text-blue-600">
                        Configured via environment variables
                      </p>
                    </div>

                    {/* Region Information */}
                    {ssoRegion !== awsRegion && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start">
                          <div className="text-sm text-yellow-800">
                            <strong>Note:</strong> Your AWS region and Identity Center region are different. 
                            This is normal if your Identity Center is configured in a different region.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Settings Summary */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">AWS Operations:</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {awsRegion}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-medium">Identity Center:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {ssoRegion}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsRegionModalOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
