import {
  IdentitystoreClient,
  ListUsersCommand as ListIdentityStoreUsersCommand
} from '@aws-sdk/client-identitystore';
import { 
  IAMClient, 
  ListUsersCommand,
  GetUserCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  GetUserPolicyCommand,
  ListGroupsForUserCommand,
  GetPolicyCommand,
  GetPolicyVersionCommand,
  ListAttachedGroupPoliciesCommand,
  ListGroupPoliciesCommand,
  GetGroupPolicyCommand,
  ListAccessKeysCommand
} from '@aws-sdk/client-iam';
import type { IdentityCenterUser, IAMUser, OrganizationUser, CrossAccountUserAccess, UserPermissions, AttachedPolicy, InlinePolicy, UserGroup, PolicyPermission, AccessKey, IAMPolicyDocument, IAMPolicyStatement } from '@/types/aws';
import { safeAsync, safeSyncOperation } from '@/lib/result';
import type { AWSCredentials } from './account-service';
import { DEFAULT_AWS_REGION } from '@/constants/api';

/**
 * Simplified service for user management operations
 */
export class UserService {
  private identityStoreClient: IdentitystoreClient;
  private iamClient: IAMClient;

  constructor(region?: string, credentials?: AWSCredentials) {
    const regionConfig = region || process.env.AWS_REGION || DEFAULT_AWS_REGION;
    this.identityStoreClient = new IdentitystoreClient({ 
      region: regionConfig,
      credentials: credentials || undefined
    });
    this.iamClient = new IAMClient({ 
      region: regionConfig,
      credentials: credentials || undefined
    });
  }

  /**
   * Get Identity Center users
   */
  async getIdentityCenterUsers(identityStoreId: string): Promise<IdentityCenterUser[]> {
    const command = new ListIdentityStoreUsersCommand({
      IdentityStoreId: identityStoreId
    });
    
    const result = await safeAsync(this.identityStoreClient.send(command));
    
    if (!result.success) {
      console.warn(`Could not list Identity Center users for store ${identityStoreId}:`, result.error);
      return [];
    }
    
    return (result.data.Users || []).map(user => ({
      UserId: user.UserId!,
      UserName: user.UserName!,
      DisplayName: user.DisplayName,
      Name: {
        FamilyName: user.Name?.FamilyName,
        GivenName: user.Name?.GivenName
      },
      Emails: (user.Emails || []).map(email => ({
        Value: email.Value || '',
        Type: email.Type,
        Primary: email.Primary
      })),
      Active: true,
      IdentityStoreId: identityStoreId
    }));
  }

  /**
   * Get IAM users (fallback when Identity Center is not available)
   */
  async getIAMUsers(): Promise<IAMUser[]> {
    const command = new ListUsersCommand({});
    const result = await safeAsync(this.iamClient.send(command));
    
    if (!result.success) {
      console.warn('Could not list IAM users:', result.error);
      return [];
    }
    
    return (result.data.Users || []).map(user => ({
      UserName: user.UserName!,
      UserId: user.UserId!,
      Arn: user.Arn!,
      CreateDate: user.CreateDate!,
      Path: user.Path!
    }));
  }

  /**
   * Convert Identity Center user to organization user format
   */
  createOrganizationUser(
    user: IdentityCenterUser, 
    homeAccountId: string = 'unknown', 
    accountAccess: CrossAccountUserAccess[] = []
  ): OrganizationUser {
    return {
      user,
      homeAccountId,
      accountAccess
    };
  }

  /**
   * Convert IAM user to organization user format
   */
  createOrganizationUserFromIAM(
    user: IAMUser, 
    accountId: string
  ): OrganizationUser {
    const identityCenterUser: IdentityCenterUser = {
      UserId: user.UserId,
      UserName: user.UserName,
      DisplayName: user.UserName,
      Name: {
        GivenName: user.UserName,
        FamilyName: ''
      },
      Emails: [],
      Active: true,
      IdentityStoreId: 'iam-fallback'
    };

    return {
      user: identityCenterUser,
      homeAccountId: accountId,
      accountAccess: [{
        accountId,
        accountName: 'Current Account',
        hasAccess: true,
        accessType: 'IAM' as const,
        lastChecked: new Date()
      }]
    };
  }

  /**
   * Search users by name or email
   */
  async searchUsers(
    identityStoreId: string, 
    searchTerm: string
  ): Promise<IdentityCenterUser[]> {
    const users = await this.getIdentityCenterUsers(identityStoreId);
    
    if (!searchTerm) return users;

    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.UserName.toLowerCase().includes(term) ||
      user.DisplayName?.toLowerCase().includes(term) ||
      user.Emails.some(email => email.Value?.toLowerCase().includes(term))
    );
  }

  /**
   * Type guard to check if value is a valid IAM Policy Document
   */
  private isValidPolicyDocument(value: unknown): value is IAMPolicyDocument {
    if (!value || typeof value !== 'object') {
      return false;
    }
    
    const doc = value as Record<string, unknown>;
    return 'Statement' in doc && (
      Array.isArray(doc.Statement) || 
      typeof doc.Statement === 'object'
    );
  }

  /**
   * Convert IAM statement to normalized permission format
   */
  private normalizeStatement(statement: IAMPolicyStatement): PolicyPermission {
    // Normalize actions
    const actions = statement.Action 
      ? (Array.isArray(statement.Action) ? statement.Action : [statement.Action])
      : (statement.NotAction ? ['*'] : ['*']);
    
    // Normalize resources
    const resources = statement.Resource
      ? (Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource])
      : (statement.NotResource ? ['*'] : ['*']);
    
    return {
      effect: statement.Effect || 'Allow',
      actions,
      resources,
      conditions: statement.Condition as Record<string, unknown> | undefined
    };
  }

  /**
   * Parse policy document and extract permissions
   */
  private async parsePolicyDocument(policyDocument: string): Promise<PolicyPermission[]> {
    // Decode URI component
    const decodeResult = safeSyncOperation(() => decodeURIComponent(policyDocument));
    if (!decodeResult.success) {
      console.warn('Failed to decode policy document:', decodeResult.error);
      return [];
    }
    
    // Parse JSON
    const parseResult = safeSyncOperation<unknown>(() => JSON.parse(decodeResult.data));
    if (!parseResult.success) {
      console.warn('Failed to parse policy document:', parseResult.error);
      return [];
    }
    
    // Validate policy document structure
    if (!this.isValidPolicyDocument(parseResult.data)) {
      console.warn('Invalid policy document structure - missing Statement property');
      return [];
    }
    
    const policy = parseResult.data;
    const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
    
    return statements.map(statement => this.normalizeStatement(statement));
  }

  /**
   * Get managed policy document
   */
  private async getManagedPolicyDocument(policyArn: string): Promise<PolicyPermission[]> {
    // Get policy
    const getPolicyCommand = new GetPolicyCommand({ PolicyArn: policyArn });
    const policyResult = await safeAsync(this.iamClient.send(getPolicyCommand));
    
    if (!policyResult.success || !policyResult.data.Policy?.DefaultVersionId) {
      return [];
    }

    // Get policy version (contains the actual policy document)
    const getPolicyVersionCommand = new GetPolicyVersionCommand({
      PolicyArn: policyArn,
      VersionId: policyResult.data.Policy.DefaultVersionId
    });
    const versionResult = await safeAsync(this.iamClient.send(getPolicyVersionCommand));
    
    if (!versionResult.success || !versionResult.data.PolicyVersion?.Document) {
      return [];
    }

    return await this.parsePolicyDocument(versionResult.data.PolicyVersion.Document);
  }

  /**
   * Get group policies (both attached and inline)
   */
  private async getGroupPolicies(groupName: string): Promise<{
    attachedPolicies: AttachedPolicy[];
    inlinePolicies: InlinePolicy[];
  }> {
    // Wrap the entire flow in safeAsync so failures are handled consistently
    const result = await safeAsync((async () => {
      // Get attached managed policies for the group
      const attachedPoliciesCommand = new ListAttachedGroupPoliciesCommand({
        GroupName: groupName
      });
      const attachedPoliciesResult = await safeAsync(this.iamClient.send(attachedPoliciesCommand));

      const attachedPoliciesData = attachedPoliciesResult.success
        ? (attachedPoliciesResult.data.AttachedPolicies || [])
        : [];

      const attachedPoliciesPromises = attachedPoliciesData.map(async (policy) => {
        const permissions = await this.getManagedPolicyDocument(policy.PolicyArn || '');
        return {
          PolicyName: policy.PolicyName || '',
          PolicyArn: policy.PolicyArn || '',
          permissions
        };
      });

      const attachedPolicies: AttachedPolicy[] = await Promise.all(attachedPoliciesPromises);

      // Get inline policies for the group
      const inlinePoliciesCommand = new ListGroupPoliciesCommand({
        GroupName: groupName
      });
      const inlinePoliciesResult = await safeAsync(this.iamClient.send(inlinePoliciesCommand));

      const inlinePolicyNames = inlinePoliciesResult.success
        ? (inlinePoliciesResult.data.PolicyNames || [])
        : [];

      const inlinePoliciesPromises = inlinePolicyNames.map(async (policyName) => {
        const policyCommand = new GetGroupPolicyCommand({
          GroupName: groupName,
          PolicyName: policyName
        });
        const result = await safeAsync(this.iamClient.send(policyCommand));
        if (!result.success || !result.data.PolicyDocument) {
          return null;
        }

        const permissions = await this.parsePolicyDocument(result.data.PolicyDocument);

        return {
          PolicyName: policyName,
          PolicyDocument: result.data.PolicyDocument,
          permissions
        } as InlinePolicy;
      });

      const inlinePoliciesResults = await Promise.all(inlinePoliciesPromises);
      const inlinePolicies: InlinePolicy[] = inlinePoliciesResults.filter((p): p is InlinePolicy => p !== null);

      return {
        attachedPolicies,
        inlinePolicies
      };
    })());

    if (!result.success) {
      console.warn(`Failed to get policies for group ${groupName}:`, result.error);
      return { attachedPolicies: [], inlinePolicies: [] };
    }

    return result.data;
  }

  /**
   * Get comprehensive IAM user permissions including policies and groups
   */
  async getIAMUserPermissions(userName: string): Promise<UserPermissions | null> {
    // Get actual user details first
    const getUserCommand = new GetUserCommand({ UserName: userName });
    const userResult = await safeAsync(this.iamClient.send(getUserCommand));
    
    if (!userResult.success || !userResult.data.User) {
      console.warn(`Failed to get user details for ${userName}:`, userResult.success ? 'User not found' : userResult.error);
      return null;
    }

    const iamUser: IAMUser = {
      UserName: userResult.data.User.UserName!,
      UserId: userResult.data.User.UserId!,
      Arn: userResult.data.User.Arn!,
      CreateDate: userResult.data.User.CreateDate!,
      Path: userResult.data.User.Path!
    };

    // Get attached managed policies
    const attachedPoliciesCommand = new ListAttachedUserPoliciesCommand({ 
      UserName: userName 
    });
    const attachedPoliciesResult = await safeAsync(this.iamClient.send(attachedPoliciesCommand));

    // Get inline policies
    const inlinePoliciesCommand = new ListUserPoliciesCommand({ 
      UserName: userName 
    });
    const inlinePoliciesResult = await safeAsync(this.iamClient.send(inlinePoliciesCommand));

    // Get inline policy documents
    const inlinePolicyNames = inlinePoliciesResult.success ? (inlinePoliciesResult.data.PolicyNames || []) : [];
    const inlinePoliciesPromises = inlinePolicyNames.map(async (policyName) => {
      const policyCommand = new GetUserPolicyCommand({
        UserName: userName,
        PolicyName: policyName
      });
      const result = await safeAsync(this.iamClient.send(policyCommand));
      if (!result.success || !result.data.PolicyDocument) {
        return null;
      }
      
      const permissions = await this.parsePolicyDocument(result.data.PolicyDocument);
      
      return {
        PolicyName: policyName,
        PolicyDocument: result.data.PolicyDocument,
        permissions
      } as InlinePolicy;
    });
    const inlinePoliciesResults = await Promise.all(inlinePoliciesPromises);
    const inlinePolicies: InlinePolicy[] = inlinePoliciesResults.filter((p): p is InlinePolicy => p !== null);

    // Get user groups
    const groupsCommand = new ListGroupsForUserCommand({ UserName: userName });
    const groupsResult = await safeAsync(this.iamClient.send(groupsCommand));

    // Get managed policy documents with permissions
    const attachedPoliciesData = attachedPoliciesResult.success 
      ? (attachedPoliciesResult.data.AttachedPolicies || [])
      : [];
    
    const attachedPoliciesPromises = attachedPoliciesData.map(async (policy) => {
      const permissions = await this.getManagedPolicyDocument(policy.PolicyArn || '');
      return {
        PolicyName: policy.PolicyName || '',
        PolicyArn: policy.PolicyArn || '',
        permissions
      };
    });
    
    const attachedPolicies: AttachedPolicy[] = await Promise.all(attachedPoliciesPromises);

    const groups: UserGroup[] = groupsResult.success
      ? (groupsResult.data.Groups || []).map(group => ({
          GroupName: group.GroupName || '',
          Arn: group.Arn || '',
          CreateDate: group.CreateDate || new Date(),
          Path: group.Path || '/'
        }))
      : [];

    // Fetch policies for each group
    const groupsWithPolicies = await Promise.all(
      groups.map(async (group) => {
        const policies = await this.getGroupPolicies(group.GroupName);
        return {
          ...group,
          attachedPolicies: policies.attachedPolicies,
          inlinePolicies: policies.inlinePolicies
        };
      })
    );

    return {
      user: iamUser,
      attachedPolicies,
      inlinePolicies,
      groups: groupsWithPolicies,
      accessKeys: await this.getAccessKeys(userName)
    };
  }

  /**
   * Get access keys for a user
   */
  async getAccessKeys(userName: string): Promise<AccessKey[]> {
    const command = new ListAccessKeysCommand({ UserName: userName });
    const result = await safeAsync(this.iamClient.send(command));
    
    if (!result.success) {
      console.warn(`Failed to list access keys for ${userName}:`, result.error);
      return [];
    }

    return (result.data.AccessKeyMetadata || []).map(key => ({
      AccessKeyId: key.AccessKeyId || '',
      Status: (key.Status as 'Active' | 'Inactive') || 'Inactive',
      CreateDate: key.CreateDate || new Date(),
      UserName: key.UserName || userName
    }));
  }
}
