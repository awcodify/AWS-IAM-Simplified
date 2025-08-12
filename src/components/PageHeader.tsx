'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  centerLayout?: boolean; // For backward compatibility
}

export default function PageHeader({ 
  title, 
  description, 
  icon, 
  children,
  actions,
  centerLayout = false
}: PageHeaderProps) {
  
  if (centerLayout) {
    // Original centered layout for backward compatibility
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            {icon}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-2">{description}</p>

          {/* Additional content slot */}
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }

  // New flexible layout with actions
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center">
          <div className="mr-4">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        {actions && (
          <div className="mt-4 lg:mt-0 flex gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Additional content slot */}
      {children}
    </div>
  );
}
