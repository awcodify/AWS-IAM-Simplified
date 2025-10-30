import { SSOService } from './sso-service';
import { OrganizationService } from './organization-service';
import { UserService } from './user-service';
import { AccountService } from './account-service';
import type { OrganizationUser, OrganizationAccount, PermissionSetDetails, AccountInfo, CrossAccountUserAccess } from '@/types/aws';

// Export individual services for direct use
export { SSOService } from './sso-service';
export { OrganizationService } from './organization-service';
export { UserService } from './user-service';
export { AccountService } from './account-service';

/**
 * Simplified main AWS service that orchestrates other services
 */
export class SimplifiedAWSService {
  private ssoService: SSOService;
  private organizationService: OrganizationService;
  private userService: UserService;
  private accountService: AccountService;

  constructor(region?: string) {
    this.ssoService = new SSOService(region);
    this.organizationService = new OrganizationService(region);
    this.userService = new UserService(region);
    this.accountService = new AccountService(region);
  }

  /**
   * Get all organization users (from Identity Center or IAM)
   */
  async getOrganizationUsers(): Promise<OrganizationUser[]> {
    try {
      // Try to get users from Identity Center first
      const ssoInstances = await this.ssoService.getSSOInstances();
      
      if (ssoInstances.length > 0) {
        const identityStoreId = ssoInstances[0].IdentityStoreId;
        const users = await this.userService.getIdentityCenterUsers(identityStoreId);
        
        return users.map(user => 
          this.userService.createOrganizationUser(user, 'unknown', [])
        );
      }

      // Fallback to IAM users
      const iamUsers = await this.userService.getIAMUsers();
      const organizationInfo = await this.organizationService.getOrganizationInfo();
      const accountId = organizationInfo?.masterAccountId || 'unknown';

      return iamUsers.map(user => 
        this.userService.createOrganizationUserFromIAM(user, accountId)
      );
    } catch (error) {
      console.warn('Could not get organization users:', error);
      return [];
    }
  }

  /**
   * Get organization accounts
   */
  async getOrganizationAccounts(): Promise<OrganizationAccount[]> {
    return this.organizationService.listAccounts();
  }

  /**
   * Get permission sets
   */
  async getPermissionSets(): Promise<Array<{ arn: string; name: string; description?: string }>> {
    try {
      const ssoInstances = await this.ssoService.getSSOInstances();
      if (ssoInstances.length === 0) return [];

      return this.ssoService.getPermissionSets(ssoInstances[0].InstanceArn);
    } catch (error) {
      console.warn('Could not get permission sets:', error);
      return [];
    }
  }

  /**
   * Get detailed permission set information
   */
  async getPermissionSetDetails(permissionSetArn: string, ssoRegion?: string): Promise<PermissionSetDetails | null> {
    try {
      // If a different SSO region is specified, use a regional service
      const ssoService = ssoRegion ? new SSOService(ssoRegion) : this.ssoService;
      
      const ssoInstances = await ssoService.getSSOInstances();
      if (ssoInstances.length === 0) return null;

      return ssoService.getPermissionSetDetails(ssoInstances[0].InstanceArn, permissionSetArn);
    } catch (error) {
      console.warn(`Could not get permission set details for ${permissionSetArn}:`, error);
      return null;
    }
  }

  /**
   * Get detailed permission set information with explicit instance ARN
   * (for compatibility with legacy code)
   */
  async getPermissionSetDetailsWithInstance(
    instanceArn: string, 
    permissionSetArn: string, 
    ssoRegion?: string
  ): Promise<PermissionSetDetails | null> {
    try {
      const ssoService = ssoRegion ? new SSOService(ssoRegion) : this.ssoService;
      return ssoService.getPermissionSetDetails(instanceArn, permissionSetArn);
    } catch (error) {
      console.warn(`Could not get permission set details for ${permissionSetArn}:`, error);
      return null;
    }
  }

  /**
   * Search users by term
   */
  async searchUsers(searchTerm: string): Promise<OrganizationUser[]> {
    try {
      const ssoInstances = await this.ssoService.getSSOInstances();
      
      if (ssoInstances.length > 0) {
        const identityStoreId = ssoInstances[0].IdentityStoreId;
        const users = await this.userService.searchUsers(identityStoreId, searchTerm);
        
        return users.map(user => 
          this.userService.createOrganizationUser(user, 'unknown', [])
        );
      }

      // For IAM users, search through all users and filter
      const allUsers = await this.getOrganizationUsers();
      const term = searchTerm.toLowerCase();
      
      return allUsers.filter(orgUser => 
        orgUser.user.UserName.toLowerCase().includes(term) ||
        orgUser.user.DisplayName?.toLowerCase().includes(term)
      );
    } catch (error) {
      console.warn('Could not search users:', error);
      return [];
    }
  }

  /**
   * Check if current account is organization management account
   */
  async isManagementAccount(): Promise<boolean> {
    return this.organizationService.isManagementAccount();
  }

  /**
   * Get organization information
   */
  async getOrganizationInfo() {
    return this.organizationService.getOrganizationInfo();
  }

  /**
   * Get current AWS account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    return this.accountService.getAccountInfo();
  }

  /**
   * Test AWS connection
   */
  async testConnection(): Promise<boolean> {
    return this.accountService.testConnection();
  }

  /**
   * Get account access for a specific user
   */
  async getUserAccountAccess(userId: string, ssoRegion?: string): Promise<CrossAccountUserAccess[]> {
    try {
      const ssoInstances = await this.ssoService.getSSOInstances();
      if (ssoInstances.length === 0) {
        console.warn('No SSO instances found');
        return [];
      }

      const accounts = await this.organizationService.listAccounts();
      return this.ssoService.getUserAccountAccess(userId, ssoInstances[0].InstanceArn, accounts);
    } catch (error) {
      console.warn('Could not get user account access:', error);
      return [];
    }
  }

  /**
   * Get account access for multiple users in bulk
   */
  async getBulkUserAccountAccess(userIds: string[], ssoRegion?: string): Promise<Map<string, CrossAccountUserAccess[]>> {
    try {
      const ssoInstances = await this.ssoService.getSSOInstances();
      if (ssoInstances.length === 0) {
        console.warn('No SSO instances found');
        return new Map();
      }

      const accounts = await this.organizationService.listAccounts();
      return this.ssoService.getBulkUserAccountAccess(userIds, ssoInstances[0].InstanceArn, accounts);
    } catch (error) {
      console.warn('Could not get bulk user account access:', error);
      return new Map();
    }
  }

  /**
   * Get SSO instances
   */
  async getSSOInstances(ssoRegion?: string) {
    // If a different region is specified, create a new SSO service for that region
    if (ssoRegion) {
      const regionalSSOService = new SSOService(ssoRegion);
      return regionalSSOService.getSSOInstances();
    }
    return this.ssoService.getSSOInstances();
  }

  /**
   * List organization accounts
   */
  async listOrganizationAccounts(): Promise<OrganizationAccount[]> {
    return this.organizationService.listAccounts();
  }
}
