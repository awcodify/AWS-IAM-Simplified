'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  centerLayout?: boolean; // For backward compatibility
  rightText?: string; // New prop for right side text (like "Last analyzed:")
  gradientFrom?: string; // Custom gradient start color
  gradientTo?: string; // Custom gradient end color
}

export default function PageHeader({ 
  title, 
  description, 
  icon, 
  children,
  actions,
  centerLayout = false,
  rightText,
  gradientFrom = 'from-red-50',
  gradientTo = 'to-orange-50'
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
    <div className="bg-white shadow overflow-hidden">
      {/* Header with gradient background - rounded top, conditional bottom rounding */}
      <div className={`p-6 bg-gradient-to-r ${gradientFrom} ${gradientTo} ${children ? 'border-b border-gray-200 rounded-t-lg' : 'rounded-lg'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              <p className="text-gray-600 text-sm mt-1">{description}</p>
            </div>
          </div>
          
          {/* Right side content */}
          <div className="flex items-center gap-4">
            {rightText && (
              <div className="text-sm text-gray-600">
                {rightText}
              </div>
            )}
            {actions && (
              <div className="flex gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional content slot - rounded bottom only */}
      {children && (
        <div className="p-6 rounded-b-lg">
          {children}
        </div>
      )}
    </div>
  );
}
