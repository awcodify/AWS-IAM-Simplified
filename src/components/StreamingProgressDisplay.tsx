import React from 'react';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface StreamingProgress {
  currentIndex: number;
  totalCount: number;
  permissionSetName: string;
  message: string;
  currentStep: string;
  progress: number;
}

interface StreamingProgressDisplayProps {
  progress: StreamingProgress | null;
  isStreaming: boolean;
  onClose?: () => void;
}

export default function StreamingProgressDisplay({ 
  progress, 
  isStreaming,
  onClose
}: StreamingProgressDisplayProps) {
  if (!progress && !isStreaming) {
    return null;
  }

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-600';
    if (progress >= 75) return 'bg-blue-600';
    if (progress >= 50) return 'bg-yellow-600';
    return 'bg-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStepIcon(progress?.currentStep || 'analyzing')}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Risk Analysis Progress
            </h3>
            <p className="text-sm text-gray-600">
              {progress?.message || 'Processing...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {progress?.currentIndex || 0}/{progress?.totalCount || 0}
            </div>
            <div className="text-sm text-gray-600">
              Permission Sets
            </div>
          </div>
          
          {/* Close button - show when complete */}
          {progress?.currentStep === 'complete' && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close progress display"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm font-medium text-gray-700">
            {progress?.progress || 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(progress?.progress || 0)}`}
            style={{ width: `${progress?.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Current Permission Set */}
      {progress?.permissionSetName && progress?.currentStep === 'analyzing' && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">
              Currently analyzing: 
            </span>
            <span className="text-sm text-blue-700 font-mono">
              {progress.permissionSetName}
            </span>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {progress?.currentStep === 'complete' && (
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Analysis complete! All permission sets have been analyzed.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
