// AWS IAM related types
export interface IAMUser {
  UserName: string;
  UserId: string;
  Arn: string;
  CreateDate: Date;
  Path: string;
}

// IAM Identity Center types
export interface IdentityCenterUser {
  UserId: string;
  UserName: string;
  Name: {
    GivenName?: string;
    FamilyName?: string;
    Formatted?: string;
  };
  DisplayName?: string;
  Emails: Array<{
    Value: string;
    Type?: string;
    Primary?: boolean;
  }>;
  Active: boolean;
  IdentityStoreId: string;
}

export interface SSOInstance {
  InstanceArn: string;
  IdentityStoreId: string;
  Name?: string;
  Status?: string;
  Region?: string;
}

export interface AttachedPolicy {
  PolicyName: string;
  PolicyArn: string;
}

export interface InlinePolicy {
  PolicyName: string;
  PolicyDocument: string;
}

export interface UserGroup {
  GroupName: string;
  Arn: string;
  CreateDate: Date;
  Path: string;
}

export interface UserPermissions {
  user: IAMUser;
  attachedPolicies: AttachedPolicy[];
  inlinePolicies: InlinePolicy[];
  groups: UserGroup[];
}

export interface ResourceAccess {
  service: string;
  resource: string;
  actions: string[];
  effect: 'Allow' | 'Deny';
}

export interface AccountInfo {
  accountId: string;
  arn: string;
  userId: string;
}

// Organization-wide types
export interface OrganizationAccount {
  id: string;
  name: string;
  email: string;
  status: string;
  arn: string;
}

export interface CrossAccountUserAccess {
  accountId: string;
  accountName: string;
  hasAccess: boolean;
  accessType?: 'IAM' | 'SSO' | 'AssumedRole';
  roles?: string[];
  lastChecked: Date;
}

export interface OrganizationUser {
  user: IdentityCenterUser; // Changed from IAMUser to IdentityCenterUser
  homeAccountId: string;
  accountAccess: CrossAccountUserAccess[];
}

// API Response types
export interface UserSearchResponse {
  success: boolean;
  data?: UserPermissions;
  error?: string;
}

export interface UsersListResponse {
  success: boolean;
  data?: IAMUser[];
  error?: string;
}

export interface OrganizationUsersResponse {
  success: boolean;
  data?: OrganizationUser[];
  error?: string;
}

export interface OrganizationAccountsResponse {
  success: boolean;
  data?: OrganizationAccount[];
  error?: string;
}

export interface AccountResponse {
  success: boolean;
  data?: AccountInfo;
  error?: string;
}
