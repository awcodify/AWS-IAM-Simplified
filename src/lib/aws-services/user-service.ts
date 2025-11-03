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
import { logger } from '@/lib/logger';
import { parsePolicyDocument as parsePolicy } from '@/lib/utils/policy-parser';

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
      logger.warn('Could not list Identity Center users', { identityStoreId }, result.error);
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

    const parseResult = parsePolicy(versionResult.data.PolicyVersion.Document);
    if (!parseResult.success) {
      logger.warn('Failed to parse managed policy document', { 
        policyArn, 
        error: parseResult.error.message 
      });
      return [];
    }
    
    return parseResult.data;
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

        const parseResult = parsePolicy(result.data.PolicyDocument);
        const permissions = parseResult.success ? parseResult.data : [];

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
    // Get user details
    const iamUser = await this.fetchUserDetails(userName);
    if (!iamUser) {
      return null;
    }

    // Fetch all user permission components in parallel
    const [attachedPolicies, inlinePolicies, groupsWithPolicies, accessKeys] = await Promise.all([
      this.fetchUserAttachedPolicies(userName),
      this.fetchUserInlinePolicies(userName),
      this.fetchUserGroupsWithPolicies(userName),
      this.getAccessKeys(userName)
    ]);

    return {
      user: iamUser,
      attachedPolicies,
      inlinePolicies,
      groups: groupsWithPolicies,
      accessKeys
    };
  }

  /**
   * Fetch IAM user details
   * @private
   */
  private async fetchUserDetails(userName: string): Promise<IAMUser | null> {
    const getUserCommand = new GetUserCommand({ UserName: userName });
    const userResult = await safeAsync(this.iamClient.send(getUserCommand));
    
    if (!userResult.success || !userResult.data.User) {
      console.warn(`Failed to get user details for ${userName}:`, userResult.success ? 'User not found' : userResult.error);
      return null;
    }

    return {
      UserName: userResult.data.User.UserName!,
      UserId: userResult.data.User.UserId!,
      Arn: userResult.data.User.Arn!,
      CreateDate: userResult.data.User.CreateDate!,
      Path: userResult.data.User.Path!
    };
  }

  /**
   * Fetch user's attached managed policies with their permissions
   * @private
   */
  private async fetchUserAttachedPolicies(userName: string): Promise<AttachedPolicy[]> {
    const attachedPoliciesCommand = new ListAttachedUserPoliciesCommand({ 
      UserName: userName 
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
    
    return Promise.all(attachedPoliciesPromises);
  }

  /**
   * Fetch user's inline policies with their parsed permissions
   * @private
   */
  private async fetchUserInlinePolicies(userName: string): Promise<InlinePolicy[]> {
    const inlinePoliciesCommand = new ListUserPoliciesCommand({ 
      UserName: userName 
    });
    const inlinePoliciesResult = await safeAsync(this.iamClient.send(inlinePoliciesCommand));

    const inlinePolicyNames = inlinePoliciesResult.success 
      ? (inlinePoliciesResult.data.PolicyNames || []) 
      : [];
    
    const inlinePoliciesPromises = inlinePolicyNames.map(async (policyName) => {
      const policyCommand = new GetUserPolicyCommand({
        UserName: userName,
        PolicyName: policyName
      });
      const result = await safeAsync(this.iamClient.send(policyCommand));
      
      if (!result.success || !result.data.PolicyDocument) {
        return null;
      }
      
      const parseResult = parsePolicy(result.data.PolicyDocument);
      const permissions = parseResult.success ? parseResult.data : [];
      
      return {
        PolicyName: policyName,
        PolicyDocument: result.data.PolicyDocument,
        permissions
      } as InlinePolicy;
    });
    
    const inlinePoliciesResults = await Promise.all(inlinePoliciesPromises);
    return inlinePoliciesResults.filter((p): p is InlinePolicy => p !== null);
  }

  /**
   * Fetch user's groups with their attached policies
   * @private
   */
  private async fetchUserGroupsWithPolicies(userName: string): Promise<UserGroup[]> {
    const groupsCommand = new ListGroupsForUserCommand({ UserName: userName });
    const groupsResult = await safeAsync(this.iamClient.send(groupsCommand));

    const groups: UserGroup[] = groupsResult.success
      ? (groupsResult.data.Groups || []).map(group => ({
          GroupName: group.GroupName || '',
          Arn: group.Arn || '',
          CreateDate: group.CreateDate || new Date(),
          Path: group.Path || '/'
        }))
      : [];

    // Fetch policies for each group
    return Promise.all(
      groups.map(async (group) => {
        const policies = await this.getGroupPolicies(group.GroupName);
        return {
          ...group,
          attachedPolicies: policies.attachedPolicies,
          inlinePolicies: policies.inlinePolicies
        };
      })
    );
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
