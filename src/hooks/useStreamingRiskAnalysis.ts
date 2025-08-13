import { useState, useCallback } from 'react';
import type { UserRiskProfile } from '@/types/risk-analysis';

interface StreamingProgress {
  currentIndex: number;
  totalCount: number;
  permissionSetName: string;
  message: string;
  currentStep: string;
  progress: number;
}

interface StreamingSummary {
  totalUsers: number;
  criticalUsers: number;
  highRiskUsers: number;
  adminUsers: number;
  crossAccountUsers: number;
  averageRiskScore: number;
}

interface UseStreamingRiskAnalysisResult {
  results: UserRiskProfile[];
  progress: StreamingProgress | null;
  summary: StreamingSummary | null;
  isStreaming: boolean;
  error: string | null;
  startStreaming: (permissionSets: any[], region: string, ssoRegion: string) => Promise<void>;
  resetResults: () => void;
}

export function useStreamingRiskAnalysis(): UseStreamingRiskAnalysisResult {
  const [results, setResults] = useState<UserRiskProfile[]>([]);
  const [progress, setProgress] = useState<StreamingProgress | null>(null);
  const [summary, setSummary] = useState<StreamingSummary | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStreaming = useCallback(async (
    permissionSets: any[],
    region: string,
    ssoRegion: string
  ) => {
    setIsStreaming(true);
    setError(null);
    setResults([]);
    setProgress(null);
    setSummary(null);

    const response = await fetch('/api/risk-analysis/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        permissionSets,
        region,
        ssoRegion
      }),
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to start streaming');
      setIsStreaming(false);
      throw err;
    });

    if (!response.ok) {
      setError(`Failed to start risk analysis: ${response.statusText}`);
      setIsStreaming(false);
      return;
    }

    if (!response.body) {
      setError('No response body received');
      setIsStreaming(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read().catch(err => {
        setError(err instanceof Error ? err.message : 'Stream reading failed');
        return { done: true, value: undefined };
      });

      if (done) {
        setIsStreaming(false);
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      let currentEventType = '';
      
      for (const line of lines) {
        if (line.startsWith('event:')) {
          // Event type line - store it for the next data line
          currentEventType = line.substring(6).trim();
          console.log('Event type:', currentEventType);
        } else if (line.startsWith('data:')) {
          // Data line - process using the stored event type
          const eventData = line.substring(5).trim();
          if (!eventData) continue;

          let data: any;
          try {
            data = JSON.parse(eventData);
          } catch {
            console.warn('Failed to parse event data:', eventData);
            continue;
          }

          console.log('Received event data:', data);
          console.log('Event type for this data:', currentEventType);

          // Handle different event types based on the actual event type
          if (currentEventType === 'start') {
            // Start event
            console.log('Processing start event:', data);
            setProgress({
              currentIndex: 0,
              totalCount: data.totalPermissionSets,
              permissionSetName: '',
              message: data.message,
              currentStep: 'start',
              progress: 0
            });
          } else if (currentEventType === 'complete') {
            // Complete event - this is the key fix!
            console.log('Processing complete event:', data);
            setSummary(data.summary);
            setProgress(prev => prev ? {
              ...prev,
              currentIndex: prev.totalCount, // Set to total count to show completion
              permissionSetName: '', // Clear the current permission set name
              message: data.message,
              currentStep: 'complete',
              progress: 100
            } : null);
            setIsStreaming(false); // Set streaming to false immediately on completion
          } else if (currentEventType === 'result') {
            // Result event - permission set analysis complete
            console.log('Processing result event:', data.permissionSet.userName);
            setResults(prev => [...prev, data.permissionSet]);
            
            // Update progress using completedCount from API, but don't override complete state
            setProgress(prev => {
              // If we're already complete, don't update
              if (prev?.currentStep === 'complete') {
                console.log('Skipping result event update - already complete');
                return prev;
              }
              
              console.log('Updating progress from result event');
              const newProgress = {
                currentIndex: data.completedCount,
                totalCount: data.totalCount,
                permissionSetName: data.permissionSet.userName,
                message: data.message,
                currentStep: data.currentStep || 'analyzing',
                progress: data.progress || Math.round((data.completedCount / data.totalCount) * 100)
              };
              
              // If we've reached 100%, force completion state
              if (newProgress.progress >= 100 || data.completedCount >= data.totalCount) {
                console.log('Forcing completion state due to 100% progress');
                newProgress.currentStep = 'complete';
                newProgress.permissionSetName = '';
                newProgress.message = 'Risk analysis complete!';
                setIsStreaming(false);
              }
              
              return newProgress;
            });
          } else if (currentEventType === 'progress') {
            // Progress event - analyzing specific permission set
            console.log('Processing progress event:', data);
            setProgress({
              currentIndex: data.currentIndex,
              totalCount: data.totalCount,
              permissionSetName: data.permissionSetName || '',
              message: data.message,
              currentStep: data.currentStep || 'analyzing',
              progress: data.progress || Math.round(((data.currentIndex) / data.totalCount) * 100)
            });
          }
          
          // Reset event type after processing
          currentEventType = '';
        }
      }
    }
  }, []);

  const resetResults = useCallback(() => {
    setResults([]);
    setProgress(null);
    setSummary(null);
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    results,
    progress,
    summary,
    isStreaming,
    error,
    startStreaming,
    resetResults
  };
}
