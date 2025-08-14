/**
 * Authentication service for managing AWS credentials and sessions
 */
import { SessionInfo, AccessKeyAuthRequest } from '@/types/auth';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export class AuthService {
  private static readonly SESSION_KEY = 'aws-iam-dashboard-session';
  private static readonly SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

  /**
   * Get current session from localStorage
   */
  static getCurrentSession(): SessionInfo | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;

      const session: SessionInfo = JSON.parse(stored);
      
      // Check if session is expired
      if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
        this.clearSession();
        return null;
      }

      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * Save session to localStorage
   */
  static saveSession(session: SessionInfo): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify({
        ...session,
        lastActivity: new Date().toISOString(),
        expiresAt: session.expiresAt || new Date(Date.now() + this.SESSION_TIMEOUT).toISOString()
      }));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Clear current session
   */
  static clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * AWS credential validation rules
   */
  private static readonly VALIDATION_RULES = {
    accessKeyId: {
      minLength: 16,
      maxLength: 32,
      pattern: /^[A-Z0-9]+$/,
      prefixes: ['AKIA', 'ASIA']
    },
    secretAccessKey: {
      length: 40
    }
  };

  /**
   * Validate AWS credentials format
   */
  private static validateCredentials(accessKeyId: string, secretAccessKey: string, sessionToken?: string): boolean {
    const { accessKeyId: keyRules, secretAccessKey: secretRules } = this.VALIDATION_RULES;
    
    const isValidAccessKey = 
      accessKeyId.length >= keyRules.minLength &&
      accessKeyId.length <= keyRules.maxLength &&
      keyRules.pattern.test(accessKeyId) &&
      keyRules.prefixes.some(prefix => accessKeyId.startsWith(prefix));

    const isValidSecret = secretAccessKey.length === secretRules.length;
    const isValidSessionToken = !accessKeyId.startsWith('ASIA') || !!sessionToken;

    return isValidAccessKey && isValidSecret && isValidSessionToken;
  }

  /**
   * Authenticate using AWS access keys
   */
  static async authenticateWithAccessKeys(request: AccessKeyAuthRequest): Promise<SessionInfo | null> {
    const accessKeyId = request.accessKeyId.trim();
    const secretAccessKey = request.secretAccessKey.trim();
    const sessionToken = request.sessionToken?.trim() || undefined;

    if (!accessKeyId || !secretAccessKey) return null;
    if (!this.validateCredentials(accessKeyId, secretAccessKey, sessionToken)) return null;

    // Create temporary credentials
    const credentials = {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && { sessionToken })
    };

    // Test credentials by getting caller identity
    const sts = new STSClient({ 
      region: request.region || 'us-east-1',
      credentials
    });

    const identity = await sts.send(new GetCallerIdentityCommand({}));

    const session: SessionInfo = {
      isAuthenticated: true,
      authMethod: 'access-keys',
      accountId: identity.Account,
      userId: identity.UserId,
      userName: identity.Arn?.split('/').pop() || 'Unknown',
      region: request.region || 'us-east-1',
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT)
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Authenticate using AWS CLI profile
   * Note: Profile-based authentication is not supported in browser environments
   */
  static async authenticateWithProfile(): Promise<SessionInfo | null> {
    return null;
  }

  /**
   * Validate current session by checking expiration only
   */
  static async validateSession(session: SessionInfo): Promise<boolean> {
    // For now, just check if session hasn't expired
    // In a production environment, you'd want to validate actual credentials
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      return false;
    }
    return true;
  }

  /**
   * Refresh session if needed
   */
  static async refreshSession(): Promise<SessionInfo | null> {
    const session = this.getCurrentSession();
    if (!session) return null;

    // If session is still valid, update last activity
    if (session.expiresAt && new Date() < new Date(session.expiresAt)) {
      this.saveSession({
        ...session,
        lastActivity: new Date()
      });
      return session;
    }

    // Try to validate and refresh the session
    const isValid = await this.validateSession(session);
    if (isValid) {
      const refreshedSession = {
        ...session,
        expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
        lastActivity: new Date()
      };
      this.saveSession(refreshedSession);
      return refreshedSession;
    }

    // Session is invalid, clear it
    this.clearSession();
    return null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session?.isAuthenticated || false;
  }
}
