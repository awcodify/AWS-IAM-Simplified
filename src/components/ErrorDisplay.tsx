'use client';

import { AlertCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode; // For additional content like setup instructions
}

export default function ErrorDisplay({ 
  title = "Error", 
  message, 
  onRetry, 
  retryLabel = "Try Again",
  children 
}: ErrorDisplayProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <p className="text-sm text-red-700 mt-1">{message}</p>
          
          {children && (
            <div className="mt-3">
              {children}
            </div>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
