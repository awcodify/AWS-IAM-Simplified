import { SSOService } from './sso-service';
import { OrganizationService } from './organization-service';
import { UserService } from './user-service';
import type { OrganizationUser, OrganizationAccount, PermissionSetDetails } from '@/types/aws';

/**
 * Simplified main AWS service that orchestrates other services
 */
export class SimplifiedAWSService {
  private ssoService: SSOService;
  private organizationService: OrganizationService;
  private userService: UserService;

  constructor(region?: string) {
    this.ssoService = new SSOService(region);
    this.organizationService = new OrganizationService(region);
    this.userService = new UserService(region);
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
  async getPermissionSetDetails(permissionSetArn: string): Promise<PermissionSetDetails | null> {
    try {
      const ssoInstances = await this.ssoService.getSSOInstances();
      if (ssoInstances.length === 0) return null;

      return this.ssoService.getPermissionSetDetails(ssoInstances[0].InstanceArn, permissionSetArn);
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
}
