/**
 * Client-side utilities for handling AWS credentials
 */

export interface StoredCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

/**
 * Get stored credentials from localStorage
 */
export function getStoredCredentials(): StoredCredentials | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('aws-credentials');
    if (!stored) return null;
    
    return JSON.parse(stored) as StoredCredentials;
  } catch {
    return null;
  }
}

/**
 * Store credentials in localStorage
 */
export function storeCredentials(credentials: StoredCredentials): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('aws-credentials', JSON.stringify(credentials));
}

/**
 * Clear stored credentials
 */
export function clearStoredCredentials(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('aws-credentials');
}

/**
 * Create headers with AWS credentials for API requests
 */
export function createAuthHeaders(credentials?: StoredCredentials | null): HeadersInit {
  const creds = credentials || getStoredCredentials();
  if (!creds) return {};
  
  const headers: HeadersInit = {
    'x-aws-access-key-id': creds.accessKeyId,
    'x-aws-secret-access-key': creds.secretAccessKey,
  };
  
  if (creds.sessionToken) {
    headers['x-aws-session-token'] = creds.sessionToken;
  }
  
  return headers;
}
