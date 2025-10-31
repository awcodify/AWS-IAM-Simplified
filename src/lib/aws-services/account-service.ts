import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { 
  OrganizationsClient, 
  DescribeAccountCommand,
  AWSOrganizationsNotInUseException
} from '@aws-sdk/client-organizations';
import { IAMClient, ListAccountAliasesCommand } from '@aws-sdk/client-iam';
import type { AccountInfo } from '@/types/aws';
import { safeAsync, type Result } from '@/lib/result';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

/**
 * Simplified service for AWS account and STS operations
 */
export class AccountService {
  private stsClient: STSClient;
  private organizationsClient: OrganizationsClient;
  private iamClient: IAMClient;

  constructor(region?: string, credentials?: AWSCredentials) {
    const config = {
      region: region || process.env.AWS_REGION || 'us-east-1',
      credentials: credentials || undefined
    };
    this.stsClient = new STSClient(config);
    this.organizationsClient = new OrganizationsClient(config);
    this.iamClient = new IAMClient(config);
  }

  /**
   * Get account name from Organizations API or IAM alias
   */
  private async getAccountName(accountId: string): Promise<string | undefined> {
    // Try to get account name from Organizations API first
    const orgResult = await safeAsync(
      this.organizationsClient.send(
        new DescribeAccountCommand({ AccountId: accountId })
      )
    );

    if (orgResult.success && orgResult.data.Account?.Name) {
      return orgResult.data.Account.Name;
    }

    // Fallback to IAM account alias
    const aliasResult = await safeAsync(
      this.iamClient.send(new ListAccountAliasesCommand({}))
    );

    if (aliasResult.success && aliasResult.data.AccountAliases && aliasResult.data.AccountAliases.length > 0) {
      return aliasResult.data.AccountAliases[0];
    }

    return undefined;
  }

  /**
   * Get current AWS account information
   */
  async getAccountInfo(): Promise<Result<AccountInfo, Error>> {
    const command = new GetCallerIdentityCommand({});
    
    const result = await safeAsync(this.stsClient.send(command));
    if (!result.success) {
      console.error('Failed to get caller identity:', result.error);
      return result;
    }

    const accountId = result.data.Account || 'unknown';
    const accountName = await this.getAccountName(accountId);

    return {
      success: true as const,
      data: {
        accountId,
        accountName,
        arn: result.data.Arn || 'unknown',
        userId: result.data.UserId || 'unknown'
      }
    };
  }

  /**
   * Test AWS connection by attempting to get account info
   */
  async testConnection(): Promise<boolean> {
    const result = await this.getAccountInfo();
    return result.success;
  }
}
