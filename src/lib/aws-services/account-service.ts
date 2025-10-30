import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import type { AccountInfo } from '@/types/aws';

/**
 * Simplified service for AWS account and STS operations
 */
export class AccountService {
  private stsClient: STSClient;

  constructor(region?: string) {
    this.stsClient = new STSClient({
      region: region || process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Get current AWS account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    console.log('Attempting to get caller identity...');
    const command = new GetCallerIdentityCommand({});
    const response = await this.stsClient.send(command);
    
    console.log('STS Response:', response);
    
    return {
      accountId: response.Account || 'unknown',
      arn: response.Arn || 'unknown',
      userId: response.UserId || 'unknown'
    };
  }

  /**
   * Test AWS connection by attempting to get account info
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
