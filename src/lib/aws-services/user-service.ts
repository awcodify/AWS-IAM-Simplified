import {
  IdentitystoreClient,
  ListUsersCommand as ListIdentityStoreUsersCommand
} from '@aws-sdk/client-identitystore';
import { 
  IAMClient, 
  ListUsersCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  GetUserPolicyCommand,
  ListGroupsForUserCommand
} from '@aws-sdk/client-iam';
import type { IdentityCenterUser, IAMUser, OrganizationUser, CrossAccountUserAccess, UserPermissions, AttachedPolicy, InlinePolicy, UserGroup } from '@/types/aws';
import { safeAsync } from '@/lib/result';
import type { AWSCredentials } from './account-service';

/**
 * Simplified service for user management operations
 */
export class UserService {
  private identityStoreClient: IdentitystoreClient;
  private iamClient: IAMClient;

  constructor(region?: string, credentials?: AWSCredentials) {
    const regionConfig = region || process.env.AWS_REGION || 'us-east-1';
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
   * Get comprehensive IAM user permissions including policies and groups
   */
  async getIAMUserPermissions(userName: string): Promise<UserPermissions | null> {
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
      return result.success ? {
        PolicyName: policyName,
        PolicyDocument: result.data.PolicyDocument || ''
      } : null;
    });
    const inlinePoliciesResults = await Promise.all(inlinePoliciesPromises);
    const inlinePolicies = inlinePoliciesResults.filter((p): p is InlinePolicy => p !== null);

    // Get user groups
    const groupsCommand = new ListGroupsForUserCommand({ UserName: userName });
    const groupsResult = await safeAsync(this.iamClient.send(groupsCommand));

    const attachedPolicies: AttachedPolicy[] = attachedPoliciesResult.success 
      ? (attachedPoliciesResult.data.AttachedPolicies || []).map(policy => ({
          PolicyName: policy.PolicyName || '',
          PolicyArn: policy.PolicyArn || ''
        }))
      : [];

    const groups: UserGroup[] = groupsResult.success
      ? (groupsResult.data.Groups || []).map(group => ({
          GroupName: group.GroupName || '',
          Arn: group.Arn || '',
          CreateDate: group.CreateDate || new Date(),
          Path: group.Path || '/'
        }))
      : [];

    return {
      user: {
        UserName: userName,
        UserId: '',
        Arn: '',
        CreateDate: new Date(),
        Path: '/'
      },
      attachedPolicies,
      inlinePolicies,
      groups
    };
  }
}
