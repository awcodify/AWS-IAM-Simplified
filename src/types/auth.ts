/**
 * Authentication and session management types
 */

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
}

export interface AWSProfile {
  name: string;
  region?: string;
  output?: string;
  ssoStartUrl?: string;
  ssoRegion?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
}

export interface SessionInfo {
  isAuthenticated: boolean;
  authMethod: 'sso' | 'access-keys' | 'profile' | null;
  accountId?: string;
  userId?: string;
  userName?: string;
  region?: string;
  ssoRegion?: string;
  profile?: string;
  expiresAt?: Date;
  lastActivity?: Date;
}

export interface AuthenticationState {
  session: SessionInfo | null;
  loading: boolean;
  error: string | null;
}

export interface AccessKeysLoginData {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface ProfileLoginData {
  profileName: string;
  region?: string;
}

export type LoginData = AccessKeysLoginData | ProfileLoginData;

export interface SSOAuthRequest {
  startUrl: string;
  region: string;
  clientName?: string;
}

export interface AccessKeyAuthRequest {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region?: string;
}

export interface ProfileAuthRequest {
  profileName: string;
  region?: string;
}
