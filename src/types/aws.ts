// AWS IAM related types
export interface IAMUser {
  UserName: string;
  UserId: string;
  Arn: string;
  CreateDate: Date;
  Path: string;
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

export interface AccountResponse {
  success: boolean;
  data?: AccountInfo;
  error?: string;
}
