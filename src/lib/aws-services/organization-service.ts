import {
  OrganizationsClient,
  ListAccountsCommand,
  DescribeOrganizationCommand
} from '@aws-sdk/client-organizations';
import type { OrganizationAccount } from '@/types/aws';
import { safeAsync } from '@/lib/result';
import { Optional } from '@/lib/optional';

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
    const command = new ListAccountsCommand({});
    const result = await safeAsync(this.organizationsClient.send(command));
    
    if (!result.success) {
      console.warn('Could not list organization accounts:', result.error);
      return [];
    }
    
    return (result.data.Accounts || []).map(account => ({
      id: account.Id!,
      name: account.Name!,
      email: account.Email!,
      status: account.Status!,
      arn: account.Arn!
    }));
  }

  /**
   * Get organization information
   */
  async getOrganizationInfo() {
    const command = new DescribeOrganizationCommand({});
    const result = await safeAsync(this.organizationsClient.send(command));
    
    if (!result.success) {
      console.warn('Could not get organization info:', result.error);
      return null;
    }
    
    return {
      id: result.data.Organization?.Id,
      arn: result.data.Organization?.Arn,
      masterAccountId: result.data.Organization?.MasterAccountId,
      masterAccountEmail: result.data.Organization?.MasterAccountEmail,
      featureSet: result.data.Organization?.FeatureSet
    };
  }

  /**
   * Check if the current account is the organization management account
   */
  async isManagementAccount(): Promise<boolean> {
    const orgInfo = await this.getOrganizationInfo();
    if (!orgInfo) return false;

    // You would typically get the current account ID from STS
    // For now, we'll return true as a default
    return true;
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<Optional<OrganizationAccount>> {
    const accounts = await this.listAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    return Optional.of(account);
  }
}
