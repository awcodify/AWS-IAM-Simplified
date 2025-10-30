import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import type { AccountInfo } from '@/types/aws';
import { safeAsync, type Result } from '@/lib/result';

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
  async getAccountInfo(): Promise<Result<AccountInfo, Error>> {
    console.log('Attempting to get caller identity...');
    const command = new GetCallerIdentityCommand({});
    
    return safeAsync(this.stsClient.send(command))
      .then(result => {
        if (!result.success) {
          console.error('Failed to get caller identity:', result.error);
          return result;
        }
        
        console.log('STS Response:', result.data);
        
        return {
          success: true as const,
          data: {
            accountId: result.data.Account || 'unknown',
            arn: result.data.Arn || 'unknown',
            userId: result.data.UserId || 'unknown'
          }
        };
      });
  }

  /**
   * Test AWS connection by attempting to get account info
   */
  async testConnection(): Promise<boolean> {
    const result = await this.getAccountInfo();
    return result.success;
  }
}
