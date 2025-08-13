import React from 'react';
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

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
  onRefresh?: () => void;
}

export default function StreamingProgressDisplay({ 
  progress, 
  isStreaming,
  onRefresh
}: StreamingProgressDisplayProps) {
  // Always show the component when permission sets are available
  const isComplete = progress?.currentStep === 'complete';
  const hasStarted = Boolean(progress);
  
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-600';
    if (progress >= 75) return 'bg-blue-600';
    if (progress >= 50) return 'bg-yellow-600';
    return 'bg-gray-600';
  };
  
  return (
    <div className={`rounded-lg border p-4 transition-all duration-300 ${
      isComplete 
        ? 'bg-green-50 border-green-200' 
        : hasStarted
        ? 'bg-blue-50 border-blue-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      
      {/* Header with title and refresh button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Risk Analysis
        </h3>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isStreaming}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isStreaming
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isComplete
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : hasStarted
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${isStreaming ? 'animate-spin' : ''}`} />
            <span>
              {isStreaming ? 'Analyzing...' : hasStarted ? 'Re-analyze' : 'Start Analysis'}
            </span>
          </button>
        )}
      </div>

      {/* Current Status */}
      <div className="mb-3">
        {isStreaming && progress?.permissionSetName ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm text-gray-700">Currently scanning:</span>
            <span className="text-sm font-mono bg-white px-2 py-1 rounded border text-blue-700">
              {progress.permissionSetName}
            </span>
          </div>
        ) : isComplete ? (
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Analysis completed successfully
            </span>
          </div>
        ) : hasStarted ? (
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700">
              Analysis paused or stopped
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-gray-400"></div>
            <span className="text-sm text-gray-600">
              Ready to start risk analysis
            </span>
          </div>
        )}
      </div>

      {/* Progress Section */}
      {hasStarted && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">
              {progress?.currentIndex || 0} of {progress?.totalCount || 0} permission sets
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress?.progress || 0)}`}
              style={{ width: `${progress?.progress || 0}%` }}
            />
          </div>
          
          <div className="text-right text-xs text-gray-500">
            {progress?.progress || 0}% complete
          </div>
        </div>
      )}
      
    </div>
  );
}
