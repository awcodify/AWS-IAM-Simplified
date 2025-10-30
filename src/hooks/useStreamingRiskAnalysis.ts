import { useState, useEffect, useCallback, useRef } from 'react';
import { createAuthHeaders } from '@/lib/credentials';
import type { UserRiskProfile } from '@/types/risk-analysis';
import type { PermissionSetDetails } from '@/types/aws';
import ScanSessionManager from '@/lib/scan-session-manager';

// Event data interfaces
interface StartEventData {
  totalPermissionSets: number;
  message: string;
}

interface ResultEventData {
  permissionSet: UserRiskProfile;
  completedCount: number;
  totalCount: number;
  message: string;
  currentStep?: string;
  progress?: number;
}

interface ProgressEventData {
  currentIndex: number;
  totalCount: number;
  permissionSetName?: string;
  message: string;
  currentStep?: string;
  progress?: number;
}

interface CompleteEventData {
  summary: StreamingSummary;
  message: string;
}

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
  startStreaming: (permissionSets: PermissionSetDetails[], region: string, ssoRegion: string) => Promise<void>;
  resetResults: () => void;
  canStartNewScan: (permissionSets: PermissionSetDetails[], region: string, ssoRegion: string) => boolean;
}

export function useStreamingRiskAnalysis(): UseStreamingRiskAnalysisResult {
  const [results, setResults] = useState<UserRiskProfile[]>([]);
  const [progress, setProgress] = useState<StreamingProgress | null>(null);
  const [summary, setSummary] = useState<StreamingSummary | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionManager] = useState(() => ScanSessionManager.getInstance());

  // Subscribe to session manager updates
  useEffect(() => {
    const unsubscribe = sessionManager.subscribe((session) => {
      if (session) {
        setResults(session.results);
        setProgress(session.progress);
        setSummary(session.summary);
        setError(session.error);
        setIsStreaming(session.isActive);
      } else {
        setResults([]);
        setProgress(null);
        setSummary(null);
        setError(null);
        setIsStreaming(false);
      }
    });

    return unsubscribe;
  }, [sessionManager]);

  const canStartNewScan = useCallback((permissionSets: PermissionSetDetails[], region: string, ssoRegion: string) => {
    return sessionManager.canStartNewScan(permissionSets, region, ssoRegion);
  }, [sessionManager]);

  const startStreaming = useCallback(async (
    permissionSets: PermissionSetDetails[],
    region: string,
    ssoRegion: string
  ) => {
    // Check if we can start a new scan
    if (!sessionManager.canStartNewScan(permissionSets, region, ssoRegion)) {
      console.log('Scan already in progress with same parameters, connecting to existing scan');
      return;
    }

    // Start new scan session
    const sessionId = sessionManager.startNewScan(permissionSets, region, ssoRegion);
    console.log('Started new scan session:', sessionId);

    try {
      const response = await fetch('/api/risk-analysis/stream', {
        cache: 'force-cache',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders()
        },
        body: JSON.stringify({
          permissionSets,
          region,
          ssoRegion,
          sessionId // Include session ID for tracking
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start risk analysis: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read().catch(err => {
          throw new Error(err instanceof Error ? err.message : 'Stream reading failed');
        });

        if (done) {
          sessionManager.completeScan();
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

            let data: unknown;
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
              const startData = data as StartEventData;
              const progressData = {
                currentIndex: 0,
                totalCount: startData.totalPermissionSets,
                permissionSetName: '',
                message: startData.message,
                currentStep: 'start',
                progress: 0
              };
              sessionManager.updateProgress(progressData);
            } else if (currentEventType === 'complete') {
              // Complete event
              console.log('Processing complete event:', data);
              const completeData = data as CompleteEventData;
              sessionManager.setSummary(completeData.summary);
              const progressData = {
                currentIndex: sessionManager.getScanProgress()?.totalCount || 0,
                totalCount: sessionManager.getScanProgress()?.totalCount || 0,
                permissionSetName: '',
                message: completeData.message,
                currentStep: 'complete',
                progress: 100
              };
              sessionManager.updateProgress(progressData);
              sessionManager.completeScan();
            } else if (currentEventType === 'result') {
              // Result event - permission set analysis complete
              const resultData = data as ResultEventData;
              console.log('Processing result event:', resultData.permissionSet.userName);
              sessionManager.addResult(resultData.permissionSet);
              
              // Update progress
              const progressData = {
                currentIndex: resultData.completedCount,
                totalCount: resultData.totalCount,
                permissionSetName: resultData.permissionSet.userName,
                message: resultData.message,
                currentStep: resultData.currentStep || 'analyzing',
                progress: resultData.progress || Math.round((resultData.completedCount / resultData.totalCount) * 100)
              };
              
              // If we've reached 100%, force completion state
              if (progressData.progress >= 100 || resultData.completedCount >= resultData.totalCount) {
                console.log('Forcing completion state due to 100% progress');
                progressData.currentStep = 'complete';
                progressData.permissionSetName = '';
                progressData.message = 'Risk analysis complete!';
                sessionManager.completeScan();
              }
              
              sessionManager.updateProgress(progressData);
            } else if (currentEventType === 'progress') {
              // Progress event - analyzing specific permission set
              console.log('Processing progress event:', data);
              const progressData = data as ProgressEventData;
              const updateData = {
                currentIndex: progressData.currentIndex,
                totalCount: progressData.totalCount,
                permissionSetName: progressData.permissionSetName || '',
                message: progressData.message,
                currentStep: progressData.currentStep || 'analyzing',
                progress: progressData.progress || Math.round(((progressData.currentIndex) / progressData.totalCount) * 100)
              };
              sessionManager.updateProgress(updateData);
            }
            
            // Reset event type after processing
            currentEventType = '';
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start streaming';
      console.error('Streaming error:', errorMessage);
      sessionManager.setError(errorMessage);
      throw err;
    }
  }, [sessionManager]);

  const resetResults = useCallback(() => {
    sessionManager.resetScan();
  }, [sessionManager]);

  return {
    results,
    progress,
    summary,
    isStreaming,
    error,
    startStreaming,
    resetResults,
    canStartNewScan
  };
}
