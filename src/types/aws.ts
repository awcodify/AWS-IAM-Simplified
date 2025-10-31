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
  permissions?: PolicyPermission[];
}

export interface InlinePolicy {
  PolicyName: string;
  PolicyDocument: string;
  permissions?: PolicyPermission[];
}

export interface PolicyPermission {
  effect: 'Allow' | 'Deny';
  actions: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
}

export interface UserGroup {
  GroupName: string;
  Arn: string;
  CreateDate: Date;
  Path: string;
  attachedPolicies?: AttachedPolicy[];
  inlinePolicies?: InlinePolicy[];
}

export interface AccessKey {
  AccessKeyId: string;
  Status: 'Active' | 'Inactive';
  CreateDate: Date;
  UserName: string;
}

export interface UserPermissions {
  user: IAMUser;
  attachedPolicies: AttachedPolicy[];
  inlinePolicies: InlinePolicy[];
  groups: UserGroup[];
  accessKeys?: AccessKey[];
}

export interface ResourceAccess {
  service: string;
  resource: string;
  actions: string[];
  effect: 'Allow' | 'Deny';
}

export interface AccountInfo {
  accountId: string;
  accountName?: string;
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

export interface PermissionSetDetails {
  name: string;
  arn: string;
  description?: string;
  sessionDuration?: string;
  managedPolicies?: string[];
  inlinePolicyDocument?: string;
  customerManagedPolicies?: {
    name: string;
    path: string;
  }[];
}

export interface DetailedResourceAccess {
  service: string;
  resources: string[];
  actions: string[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, unknown>;
}

export interface CrossAccountUserAccess {
  accountId: string;
  accountName: string;
  hasAccess: boolean;
  accessType?: 'IAM' | 'SSO' | 'AssumedRole';
  roles?: string[];
  permissionSets?: PermissionSetDetails[];
  detailedAccess?: DetailedResourceAccess[];
  lastChecked: Date;
}

export interface OrganizationUser {
  user: IdentityCenterUser; // Changed from IAMUser to IdentityCenterUser
  homeAccountId: string;
  accountAccess: CrossAccountUserAccess[];
}

// Pagination types
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
  pagination?: PaginationInfo;
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

// AWS SDK Error types
export interface AWSServiceError extends Error {
  name: string;
  message: string;
  $fault?: 'client' | 'server';
  $metadata?: {
    httpStatusCode?: number;
    requestId?: string;
    attempts?: number;
    totalRetryDelay?: number;
  };
  __type?: string;
}

export interface AWSThrottlingError extends AWSServiceError {
  name: 'ThrottlingException' | 'TooManyRequestsException';
}
