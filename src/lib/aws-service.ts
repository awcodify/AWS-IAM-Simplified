import { 
  IAMClient, 
  GetUserCommand, 
  ListUsersCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  GetUserPolicyCommand,
  ListGroupsForUserCommand,
  NoSuchEntityException
} from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromEnv } from '@aws-sdk/credential-providers';
import type { UserPermissions, AccountInfo, IAMUser } from '@/types/aws';

export class AWSService {
  private iamClient: IAMClient;
  private stsClient: STSClient;

  constructor(region = 'us-east-1') {
    // Try environment variables first, then fall back to AWS profile
    const credentials = fromEnv();
    
    this.iamClient = new IAMClient({ 
      region,
      credentials
    });
    
    this.stsClient = new STSClient({ 
      region,
      credentials
    });
  }

  /**
   * Get current AWS account information
   */
  async getAccountInfo(): Promise<AccountInfo | null> {
    const command = new GetCallerIdentityCommand({});
    const response = await this.stsClient.send(command);
    
    if (!response.Account || !response.Arn || !response.UserId) {
      console.error('Incomplete AWS account information received');
      return null;
    }
    
    return {
      accountId: response.Account,
      arn: response.Arn,
      userId: response.UserId
    };
  }

  /**
   * List all IAM users in the account
   */
  async listUsers(): Promise<IAMUser[]> {
    const command = new ListUsersCommand({});
    const response = await this.iamClient.send(command);
    
    return (response.Users || []).map(user => ({
      UserName: user.UserName || '',
      UserId: user.UserId || '',
      Arn: user.Arn || '',
      CreateDate: user.CreateDate || new Date(),
      Path: user.Path || '/'
    }));
  }

  /**
   * Get comprehensive user permissions including policies and groups
   */
  async getUserPermissions(userName: string): Promise<UserPermissions | null> {
    // Get basic user info
    const userCommand = new GetUserCommand({ UserName: userName });
    const userResponse = await this.iamClient.send(userCommand);
    
    if (!userResponse.User) {
      console.error(`User '${userName}' not found`);
      return null;
    }

    // Get attached managed policies
    const attachedPoliciesCommand = new ListAttachedUserPoliciesCommand({ 
      UserName: userName 
    });
    const attachedPoliciesResponse = await this.iamClient.send(attachedPoliciesCommand);

    // Get inline policies
    const inlinePoliciesCommand = new ListUserPoliciesCommand({ 
      UserName: userName 
    });
    const inlinePoliciesResponse = await this.iamClient.send(inlinePoliciesCommand);

    // Get inline policy documents
    const inlinePolicies = await Promise.all(
      (inlinePoliciesResponse.PolicyNames || []).map(async (policyName) => {
        const policyCommand = new GetUserPolicyCommand({
          UserName: userName,
          PolicyName: policyName
        });
        const policyResponse = await this.iamClient.send(policyCommand);
        return {
          PolicyName: policyName,
          PolicyDocument: policyResponse.PolicyDocument || ''
        };
      })
    );

    // Get user groups
    const groupsCommand = new ListGroupsForUserCommand({ UserName: userName });
    const groupsResponse = await this.iamClient.send(groupsCommand);

    return {
      user: {
        UserName: userResponse.User.UserName || '',
        UserId: userResponse.User.UserId || '',
        Arn: userResponse.User.Arn || '',
        CreateDate: userResponse.User.CreateDate || new Date(),
        Path: userResponse.User.Path || '/'
      },
      attachedPolicies: (attachedPoliciesResponse.AttachedPolicies || []).map(policy => ({
        PolicyName: policy.PolicyName || '',
        PolicyArn: policy.PolicyArn || ''
      })),
      inlinePolicies,
      groups: (groupsResponse.Groups || []).map(group => ({
        GroupName: group.GroupName || '',
        Arn: group.Arn || '',
        CreateDate: group.CreateDate || new Date(),
        Path: group.Path || '/'
      }))
    };
  }

  /**
   * Check if the AWS credentials are properly configured
   */
  async testConnection(): Promise<boolean> {
    const accountInfo = await this.getAccountInfo();
    return accountInfo !== null;
  }
}
