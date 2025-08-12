'use client';

import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  size = 'md' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="text-center py-12">
      <Loader2 className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto ${sizeClasses[size]}`} />
      {message && (
        <p className="text-gray-600 mt-3">{message}</p>
      )}
    </div>
  );
}
