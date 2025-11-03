import type { UserRiskProfile } from '@/types/risk-analysis';
import type { PermissionSetDetails } from '@/types/aws';
import { SCAN_SESSION_TIMEOUT } from '@/constants/api';

interface ScanSession {
  id: string;
  permissionSets: PermissionSetDetails[];
  region: string;
  ssoRegion: string;
  startTime: number;
  isActive: boolean;
  results: UserRiskProfile[];
  progress: {
    currentIndex: number;
    totalCount: number;
    permissionSetName: string;
    message: string;
    currentStep: string;
    progress: number;
  } | null;
  summary: {
    totalUsers: number;
    criticalUsers: number;
    highRiskUsers: number;
    adminUsers: number;
    crossAccountUsers: number;
    averageRiskScore: number;
  } | null;
  error: string | null;
}

class ScanSessionManager {
  private static instance: ScanSessionManager;
  private currentSession: ScanSession | null = null;
  private subscribers: Set<(session: ScanSession | null) => void> = new Set();

  private constructor() {
    // Restore session from sessionStorage on initialization
    this.restoreSession();
  }

  static getInstance(): ScanSessionManager {
    if (!ScanSessionManager.instance) {
      ScanSessionManager.instance = new ScanSessionManager();
    }
    return ScanSessionManager.instance;
  }

  private generateSessionId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveSession(): void {
    if (this.currentSession && typeof window !== 'undefined') {
      sessionStorage.setItem('riskAnalysisScanSession', JSON.stringify(this.currentSession));
    }
  }

  private restoreSession(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('riskAnalysisScanSession');
        if (stored) {
          const session = JSON.parse(stored) as ScanSession;
          // Only restore if session is less than 1 hour old
          if (Date.now() - session.startTime < SCAN_SESSION_TIMEOUT) {
            this.currentSession = session;
          } else {
            sessionStorage.removeItem('riskAnalysisScanSession');
          }
        }
      } catch (error) {
        console.warn('Failed to restore scan session:', error);
        sessionStorage.removeItem('riskAnalysisScanSession');
      }
    }
  }

  private clearSession(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('riskAnalysisScanSession');
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.currentSession));
  }

  subscribe(callback: (session: ScanSession | null) => void): () => void {
    this.subscribers.add(callback);
    // Immediately call with current session
    callback(this.currentSession);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getCurrentSession(): ScanSession | null {
    return this.currentSession;
  }

  canStartNewScan(permissionSets: PermissionSetDetails[], region: string, ssoRegion: string): boolean {
    if (!this.currentSession) return true;
    
    // If session is not active, we can start a new one
    if (!this.currentSession.isActive) return true;
    
    // Check if the parameters are the same
    const sameParams = 
      this.currentSession.region === region &&
      this.currentSession.ssoRegion === ssoRegion &&
      this.currentSession.permissionSets.length === permissionSets.length &&
      this.currentSession.permissionSets.every((ps, index) => 
        ps.arn === permissionSets[index]?.arn
      );
    
    // If same parameters and session is active, don't allow new scan
    if (sameParams && this.currentSession.isActive) {
      return false;
    }
    
    // Different parameters, allow new scan
    return true;
  }

  startNewScan(permissionSets: PermissionSetDetails[], region: string, ssoRegion: string): string {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      permissionSets,
      region,
      ssoRegion,
      startTime: Date.now(),
      isActive: true,
      results: [],
      progress: null,
      summary: null,
      error: null
    };
    
    this.saveSession();
    this.notifySubscribers();
    
    return sessionId;
  }

  updateProgress(progress: ScanSession['progress']): void {
    if (this.currentSession) {
      this.currentSession.progress = progress;
      this.saveSession();
      this.notifySubscribers();
    }
  }

  addResult(result: UserRiskProfile): void {
    if (this.currentSession) {
      this.currentSession.results = [...this.currentSession.results, result];
      this.saveSession();
      this.notifySubscribers();
    }
  }

  setSummary(summary: ScanSession['summary']): void {
    if (this.currentSession) {
      this.currentSession.summary = summary;
      this.saveSession();
      this.notifySubscribers();
    }
  }

  setError(error: string): void {
    if (this.currentSession) {
      this.currentSession.error = error;
      this.currentSession.isActive = false;
      this.saveSession();
      this.notifySubscribers();
    }
  }

  completeScan(): void {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      this.saveSession();
      this.notifySubscribers();
    }
  }

  resetScan(): void {
    this.currentSession = null;
    this.clearSession();
    this.notifySubscribers();
  }

  getScanResults(): UserRiskProfile[] {
    return this.currentSession?.results || [];
  }

  getScanProgress(): ScanSession['progress'] {
    return this.currentSession?.progress || null;
  }

  getScanSummary(): ScanSession['summary'] {
    return this.currentSession?.summary || null;
  }

  getScanError(): string | null {
    return this.currentSession?.error || null;
  }

  isScanActive(): boolean {
    return this.currentSession?.isActive || false;
  }
}

export default ScanSessionManager;
