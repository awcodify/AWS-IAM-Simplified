import { SSOService } from './sso-service';
import { OrganizationService } from './organization-service';
import { UserService } from './user-service';
import { AccountService, type AWSCredentials } from './account-service';
import type { OrganizationUser, OrganizationAccount, PermissionSetDetails, AccountInfo, CrossAccountUserAccess } from '@/types/aws';

// Export individual services for direct use
export { SSOService } from './sso-service';
export { OrganizationService } from './organization-service';
export { UserService } from './user-service';
export { AccountService, type AWSCredentials } from './account-service';

/**
 * Simplified main AWS service that orchestrates other services
 */
export class SimplifiedAWSService {
  private ssoService: SSOService;
  private organizationService: OrganizationService;
  private userService: UserService;
  private accountService: AccountService;
  private credentials?: AWSCredentials;

  constructor(region?: string, credentials?: AWSCredentials) {
    this.credentials = credentials;
    this.ssoService = new SSOService(region, credentials);
    this.organizationService = new OrganizationService(region, credentials);
    this.userService = new UserService(region, credentials);
    this.accountService = new AccountService(region, credentials);
  }

  /**
   * Get all organization users (from Identity Center or IAM)
   */
  async getOrganizationUsers(): Promise<OrganizationUser[]> {
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
    const ssoInstances = await this.ssoService.getSSOInstances();
    if (ssoInstances.length === 0) return [];

    return this.ssoService.getPermissionSets(ssoInstances[0].InstanceArn);
  }

  /**
   * Get detailed permission set information
   */
  async getPermissionSetDetails(permissionSetArn: string, ssoRegion?: string): Promise<PermissionSetDetails | null> {
    // If a different SSO region is specified, use a regional service
    const ssoService = ssoRegion ? new SSOService(ssoRegion, this.credentials) : this.ssoService;
    
    const ssoInstances = await ssoService.getSSOInstances();
    if (ssoInstances.length === 0) return null;

    return ssoService.getPermissionSetDetails(ssoInstances[0].InstanceArn, permissionSetArn);
  }

  /**
   * Search users by term
   */
  async searchUsers(searchTerm: string): Promise<OrganizationUser[]> {
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
    const result = await this.accountService.getAccountInfo();
    if (!result.success) {
      throw result.error;
    }
    return result.data;
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
    // If a different SSO region is specified, use a regional service
    const ssoService = ssoRegion ? new SSOService(ssoRegion, this.credentials) : this.ssoService;
    
    const ssoInstances = await ssoService.getSSOInstances();
    if (ssoInstances.length === 0) {
      console.warn('No SSO instances found');
      return [];
    }

    const accounts = await this.organizationService.listAccounts();
    return ssoService.getUserAccountAccess(userId, ssoInstances[0].InstanceArn, accounts);
  }

  /**
   * Get account access for multiple users in bulk
   */
  async getBulkUserAccountAccess(userIds: string[], ssoRegion?: string): Promise<Map<string, CrossAccountUserAccess[]>> {
    // If a different SSO region is specified, use a regional service
    const ssoService = ssoRegion ? new SSOService(ssoRegion, this.credentials) : this.ssoService;
    
    const ssoInstances = await ssoService.getSSOInstances();
    if (ssoInstances.length === 0) {
      console.warn('No SSO instances found');
      return new Map();
    }

    const accounts = await this.organizationService.listAccounts();
    return ssoService.getBulkUserAccountAccess(userIds, ssoInstances[0].InstanceArn, accounts);
  }

  /**
   * Get SSO instances
   */
  async getSSOInstances(ssoRegion?: string) {
    // If a different region is specified, create a new SSO service for that region
    if (ssoRegion) {
      const regionalSSOService = new SSOService(ssoRegion, this.credentials);
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
