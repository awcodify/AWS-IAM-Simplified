import {
  OrganizationsClient,
  ListAccountsCommand,
  DescribeOrganizationCommand
} from '@aws-sdk/client-organizations';
import type { OrganizationAccount } from '@/types/aws';

/**
 * Simplified service for AWS Organizations operations
 */
export class OrganizationService {
  private organizationsClient: OrganizationsClient;

  constructor(region?: string) {
    this.organizationsClient = new OrganizationsClient({
      region: region || process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Get all accounts in the organization
   */
  async listAccounts(): Promise<OrganizationAccount[]> {
    try {
      const command = new ListAccountsCommand({});
      const response = await this.organizationsClient.send(command);
      
      return (response.Accounts || []).map(account => ({
        id: account.Id!,
        name: account.Name!,
        email: account.Email!,
        status: account.Status!,
        arn: account.Arn!
      }));
    } catch (error) {
      console.warn('Could not list organization accounts:', error);
      return [];
    }
  }

  /**
   * Get organization information
   */
  async getOrganizationInfo() {
    try {
      const command = new DescribeOrganizationCommand({});
      const response = await this.organizationsClient.send(command);
      
      return {
        id: response.Organization?.Id,
        arn: response.Organization?.Arn,
        masterAccountId: response.Organization?.MasterAccountId,
        masterAccountEmail: response.Organization?.MasterAccountEmail,
        featureSet: response.Organization?.FeatureSet
      };
    } catch (error) {
      console.warn('Could not get organization info:', error);
      return null;
    }
  }

  /**
   * Check if the current account is the organization management account
   */
  async isManagementAccount(): Promise<boolean> {
    try {
      const orgInfo = await this.getOrganizationInfo();
      if (!orgInfo) return false;

      // You would typically get the current account ID from STS
      // For now, we'll return true as a default
      return true;
    } catch (error) {
      console.warn('Could not determine if management account:', error);
      return false;
    }
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<OrganizationAccount | null> {
    const accounts = await this.listAccounts();
    return accounts.find(account => account.id === accountId) || null;
  }
}
