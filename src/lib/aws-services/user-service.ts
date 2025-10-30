import {
  IdentitystoreClient,
  ListUsersCommand as ListIdentityStoreUsersCommand
} from '@aws-sdk/client-identitystore';
import { IAMClient, ListUsersCommand } from '@aws-sdk/client-iam';
import type { IdentityCenterUser, IAMUser, OrganizationUser, CrossAccountUserAccess } from '@/types/aws';
import { safeAsync } from '@/lib/result';

/**
 * Simplified service for user management operations
 */
export class UserService {
  private identityStoreClient: IdentitystoreClient;
  private iamClient: IAMClient;

  constructor(region?: string) {
    const regionConfig = region || process.env.AWS_REGION || 'us-east-1';
    this.identityStoreClient = new IdentitystoreClient({ region: regionConfig });
    this.iamClient = new IAMClient({ region: regionConfig });
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
}
