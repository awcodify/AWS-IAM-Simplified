'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({ 
  title, 
  description, 
  icon, 
  children 
}: PageHeaderProps) {

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
