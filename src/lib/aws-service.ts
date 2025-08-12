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
import { STSClient, GetCallerIdentityCommand, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { 
  OrganizationsClient, 
  ListAccountsCommand, 
  DescribeOrganizationCommand 
} from '@aws-sdk/client-organizations';
import {
  SSOAdminClient,
  ListInstancesCommand,
  ListAccountAssignmentsCommand,
  ListAccountAssignmentsForPrincipalCommand,
  ListPermissionSetsCommand
} from '@aws-sdk/client-sso-admin';
import {
  IdentitystoreClient,
  ListUsersCommand as ListIdentityStoreUsersCommand,
  GetUserIdCommand
} from '@aws-sdk/client-identitystore';
import type { 
  UserPermissions, 
  AccountInfo, 
  IAMUser, 
  IdentityCenterUser,
  SSOInstance,
  OrganizationAccount, 
  CrossAccountUserAccess, 
  OrganizationUser 
} from '@/types/aws';

export class AWSService {
  private iamClient: IAMClient;
  private stsClient: STSClient;
  private organizationsClient: OrganizationsClient;
  private ssoAdminClient: SSOAdminClient;
  private identityStoreClient: IdentitystoreClient;

  constructor(region = 'us-east-1') {
    // Use the default credential provider chain which handles:
    // 1. Environment variables
    // 2. AWS profiles (including SSO)
    // 3. Instance metadata (for EC2)
    // 4. Container credentials (for ECS/Fargate)
    
    console.log(`Using AWS region: ${region}`);
    
    this.iamClient = new IAMClient({ 
      region
    });
    
    this.stsClient = new STSClient({ 
      region
    });

    this.organizationsClient = new OrganizationsClient({
      region
    });

    this.ssoAdminClient = new SSOAdminClient({
      region
    });

    this.identityStoreClient = new IdentitystoreClient({
      region
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

  /**
   * List all accounts in the organization (requires management account permissions)
   */
  async listOrganizationAccounts(): Promise<OrganizationAccount[]> {
    const command = new ListAccountsCommand({});
    const response = await this.organizationsClient.send(command).catch(error => {
      console.log(`Cannot list organization accounts: ${error.message}`);
      return { Accounts: [] };
    });
    
    return (response.Accounts || []).map(account => ({
      id: account.Id || '',
      name: account.Name || '',
      email: account.Email || '',
      status: account.Status || '',
      arn: account.Arn || ''
    }));
  }

  /**
   * Get IAM client for a specific account using assumed role
   */
  private async getIAMClientForAccount(accountId: string, roleName = 'OrganizationAccountAccessRole'): Promise<IAMClient | null> {
    const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;
    
    const assumeRoleCommand = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: `OrgUserCheck-${Date.now()}`
    });

    // Handle assume role failures gracefully
    const assumeRoleResponse = await this.stsClient.send(assumeRoleCommand).catch(error => {
      console.log(`Cannot assume role in account ${accountId}: ${error.message}`);
      return null;
    });
    
    if (!assumeRoleResponse?.Credentials) {
      return null;
    }

    return new IAMClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: assumeRoleResponse.Credentials.AccessKeyId!,
        secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey!,
        sessionToken: assumeRoleResponse.Credentials.SessionToken
      }
    });
  }

  /**
   * Check if a user exists in a specific account
   */
  private async checkUserInAccount(userName: string, accountId: string): Promise<CrossAccountUserAccess> {
    const baseAccess: CrossAccountUserAccess = {
      accountId,
      accountName: '', // Will be filled by caller
      hasAccess: false,
      lastChecked: new Date()
    };

    const iamClient = await this.getIAMClientForAccount(accountId);
    if (!iamClient) {
      return baseAccess;
    }

    const getUserCommand = new GetUserCommand({ UserName: userName });
    
    // Handle the specific case where user doesn't exist in the account
    const userResponse = await iamClient.send(getUserCommand).catch(error => {
      if (error instanceof NoSuchEntityException) {
        // User doesn't exist in this account - this is expected
        return null;
      }
      // Re-throw other errors
      throw error;
    });
    
    if (userResponse?.User) {
      return {
        ...baseAccess,
        hasAccess: true,
        accessType: 'IAM'
      };
    }

    return baseAccess;
  }

  /**
   * Get SSO instances in a specific region
   */
  async getSSOInstances(region?: string): Promise<SSOInstance[]> {
    const targetRegion = region || 'us-east-1';
    
    console.log(`Attempting to list SSO instances in region: ${targetRegion}...`);
    
    const ssoAdminClient = new SSOAdminClient({ region: targetRegion });
    const command = new ListInstancesCommand({});
    
    return ssoAdminClient.send(command)
      .then(response => {
        console.log(`SSO Instances response for ${targetRegion}:`, response);
        
        if (response.Instances && response.Instances.length > 0) {
          console.log(`Found SSO instances in region: ${targetRegion}`);
          
          const instances = response.Instances.map(instance => ({
            InstanceArn: instance.InstanceArn || '',
            IdentityStoreId: instance.IdentityStoreId || '',
            Name: instance.Name,
            Status: instance.Status,
            Region: targetRegion
          }));
          
          console.log(`Found ${instances.length} SSO instances in ${targetRegion}`);
          return instances;
        } else {
          console.log(`No SSO instances found in region: ${targetRegion}`);
          return [];
        }
      })
      .catch(error => {
        console.error(`Error checking SSO instances in region ${targetRegion}:`, error);
        throw error;
      });
  }

  /**
   * Get Identity Center users
   */
  async getIdentityCenterUsers(identityStoreId: string, region?: string): Promise<IdentityCenterUser[]> {
    const client = region ? new IdentitystoreClient({ region }) : this.identityStoreClient;
    
    const command = new ListIdentityStoreUsersCommand({
      IdentityStoreId: identityStoreId
    });
    const response = await client.send(command);
    
    return (response.Users || []).map(user => ({
      UserId: user.UserId || '',
      UserName: user.UserName || '',
      Name: {
        GivenName: user.Name?.GivenName,
        FamilyName: user.Name?.FamilyName,
        Formatted: user.Name?.Formatted
      },
      DisplayName: user.DisplayName,
      Emails: (user.Emails || []).map(email => ({
        Value: email.Value || '',
        Type: email.Type,
        Primary: email.Primary
      })),
      Active: true, // Default to true since the API doesn't return this field directly
      IdentityStoreId: identityStoreId
    }));
  }

  /**
   * Get organization-wide user information (using IAM Identity Center)
   */
  async getOrganizationUsers(ssoRegion?: string): Promise<OrganizationUser[]> {
    console.log('Starting getOrganizationUsers...');
    
    // Get SSO instances
    return this.getSSOInstances(ssoRegion)
      .then(async ssoInstances => {
        if (ssoInstances.length === 0) {
          console.warn(`No SSO instances found in region: ${ssoRegion || 'us-east-1'}`);
          console.warn('This could mean:');
          console.warn('1. IAM Identity Center is not enabled in this AWS account');
          console.warn('2. You do not have permissions to access SSO Admin service');
          console.warn('3. IAM Identity Center is enabled in a different region');
          
          // Fallback: Try to get IAM users from organization accounts instead
          console.log('Falling back to IAM users across organization accounts...');
          return await this.getOrganizationIAMUsers();
        }

        console.log(`Found ${ssoInstances.length} SSO instance(s)`);
        
        // Use the first SSO instance (typically there's only one)
        const ssoInstance = ssoInstances[0];
        console.log('Using SSO instance:', ssoInstance);
        
        const currentAccount = await this.getAccountInfo();
        
        if (!currentAccount) {
          console.error('Could not get current account info');
          return [];
        }

        // Get users from Identity Center
        console.log('Getting Identity Center users...');
        const identityCenterUsers = await this.getIdentityCenterUsers(ssoInstance.IdentityStoreId, ssoInstance.Region);
        console.log(`Found ${identityCenterUsers.length} Identity Center users`);
        
        if (identityCenterUsers.length === 0) {
          console.log('No Identity Center users found, falling back to IAM users...');
          return await this.getOrganizationIAMUsers();
        }
        
        // Just return users without processing account access (lazy loading)
        const organizationUsers: OrganizationUser[] = identityCenterUsers.map(user => ({
          user,
          homeAccountId: currentAccount.accountId,
          accountAccess: [] // Empty - will be loaded on demand
        }));
        
        console.log(`Returning ${organizationUsers.length} organization users (lazy loading)`);
        return organizationUsers;
      })
      .catch(async error => {
        console.error('Error in getOrganizationUsers:', error);
        
        // If there's an error with Identity Center, fall back to IAM users
        console.log('Error with Identity Center, falling back to IAM users...');
        return await this.getOrganizationIAMUsers();
      });
  }

  /**
   * Check if an Identity Center user has access to a specific account
   */
  async checkIdentityCenterUserInAccount(
    userId: string, 
    accountId: string, 
    instanceArn: string,
    region?: string
  ): Promise<CrossAccountUserAccess> {
    const ssoAdminClient = region ? new SSOAdminClient({ region }) : this.ssoAdminClient;
    
    // First get all permission sets for this instance
    const permissionSetsCommand = new ListPermissionSetsCommand({
      InstanceArn: instanceArn
    });
    
    return ssoAdminClient.send(permissionSetsCommand)
      .then(async permissionSetsResponse => {
        const permissionSets = permissionSetsResponse.PermissionSets || [];
        const userAssignments: string[] = [];
        
        // Check each permission set for assignments to this user in this account
        for (const permissionSetArn of permissionSets) {
          const assignmentsCommand = new ListAccountAssignmentsCommand({
            InstanceArn: instanceArn,
            AccountId: accountId,
            PermissionSetArn: permissionSetArn
          });
          
          await ssoAdminClient.send(assignmentsCommand)
            .then(assignmentsResponse => {
              const assignments = assignmentsResponse.AccountAssignments || [];
              
              // Check if any assignment is for this user
              const hasUserAssignment = assignments.some(assignment => 
                assignment.PrincipalType === 'USER' && assignment.PrincipalId === userId
              );
              
              if (hasUserAssignment) {
                userAssignments.push(permissionSetArn);
              }
            })
            .catch(error => {
              // Continue checking other permission sets if one fails
              console.warn(`Error checking permission set ${permissionSetArn}:`, error);
            });
        }
        
        return {
          accountId,
          accountName: '', // Will be set by the caller
          hasAccess: userAssignments.length > 0,
          accessType: 'SSO' as const,
          roles: userAssignments,
          lastChecked: new Date()
        };
      })
      .catch(error => {
        console.warn(`Could not check Identity Center access for user ${userId} in account ${accountId}:`, error);
        return {
          accountId,
          accountName: '', // Will be set by the caller
          hasAccess: false,
          accessType: 'SSO',
          lastChecked: new Date()
        };
      });
  }

  /**
   * Get account access for multiple Identity Center users in bulk
   * This is the most efficient approach - fetch all users' access at once
   */
  async getBulkUserAccountAccess(userIds: string[], ssoRegion?: string): Promise<Map<string, CrossAccountUserAccess[]>> {
    console.log(`Getting account access for ${userIds.length} users in bulk`);
    
    // Get SSO instances
    return this.getSSOInstances(ssoRegion)
      .then(async ssoInstances => {
        if (ssoInstances.length === 0) {
          console.warn('No SSO instances found');
          return new Map();
        }

        // Use the first SSO instance
        const ssoInstance = ssoInstances[0];
        const ssoAdminClient = new SSOAdminClient({ region: ssoInstance.Region });
        
        // Get all organization accounts to map account IDs to names
        const accounts = await this.listOrganizationAccounts();
        const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));
        console.log(`Retrieved ${accounts.length} organization accounts`);
        
        // Result map: userId -> account access list
        const userAccessMap = new Map<string, CrossAccountUserAccess[]>();
        
        // Initialize all users with empty access
        userIds.forEach(userId => {
          userAccessMap.set(userId, accounts.map(account => ({
            accountId: account.id,
            accountName: account.name,
            hasAccess: false,
            accessType: 'SSO' as const,
            roles: [],
            lastChecked: new Date()
          })));
        });
        
        // Fetch assignments for all users in parallel
        const assignmentPromises = userIds.map(async (userId) => {
          const assignmentsCommand = new ListAccountAssignmentsForPrincipalCommand({
            InstanceArn: ssoInstance.InstanceArn,
            PrincipalType: 'USER',
            PrincipalId: userId
          });
          
          try {
            const response = await ssoAdminClient.send(assignmentsCommand);
            const assignments = response.AccountAssignments || [];
            console.log(`Found ${assignments.length} account assignments for user ${userId}`);
            
            // Group assignments by account ID for this user
            const accountAssignments = new Map<string, string[]>();
            assignments.forEach((assignment) => {
              if (assignment.AccountId && assignment.PermissionSetArn) {
                const accountId = assignment.AccountId;
                const existingRoles = accountAssignments.get(accountId) || [];
                existingRoles.push(assignment.PermissionSetArn);
                accountAssignments.set(accountId, existingRoles);
              }
            });
            
            // Update the user's access map
            const userAccess = userAccessMap.get(userId) || [];
            userAccess.forEach(access => {
              const roles = accountAssignments.get(access.accountId) || [];
              if (roles.length > 0) {
                access.hasAccess = true;
                access.roles = roles;
              }
            });
            
            return { userId, success: true };
          } catch (error) {
            console.error(`Error getting account assignments for user ${userId}:`, error);
            return { userId, success: false };
          }
        });
        
        const results = await Promise.all(assignmentPromises);
        const successCount = results.filter(r => r.success).length;
        console.log(`Successfully fetched access for ${successCount}/${userIds.length} users`);
        
        return userAccessMap;
      })
      .catch(error => {
        console.error('Error getting bulk account access:', error);
        return new Map();
      });
  }

  /**
   * Get account access for a specific Identity Center user using ListAccountAssignmentsForPrincipal
   * This is much more efficient than checking each account individually
   */
  async getUserAccountAccess(userId: string, ssoRegion?: string): Promise<CrossAccountUserAccess[]> {
    console.log(`Getting account access for user: ${userId}`);
    
    // Get SSO instances
    return this.getSSOInstances(ssoRegion)
      .then(async ssoInstances => {
        if (ssoInstances.length === 0) {
          console.warn('No SSO instances found');
          return [];
        }

        // Use the first SSO instance
        const ssoInstance = ssoInstances[0];
        const ssoAdminClient = new SSOAdminClient({ region: ssoInstance.Region });
        
        // Get all organization accounts to map account IDs to names
        const accounts = await this.listOrganizationAccounts();
        const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));
        console.log(`Retrieved ${accounts.length} organization accounts for user ${userId}`);
        
        // Use ListAccountAssignmentsForPrincipal to get all assignments for this user in one call
        const assignmentsCommand = new ListAccountAssignmentsForPrincipalCommand({
          InstanceArn: ssoInstance.InstanceArn,
          PrincipalType: 'USER',
          PrincipalId: userId
        });
        
        return ssoAdminClient.send(assignmentsCommand)
          .then(response => {
            const assignments = response.AccountAssignments || [];
            console.log(`Found ${assignments.length} account assignments for user ${userId}`);
            
            // Group assignments by account ID
            const accountAssignments = new Map<string, string[]>();
            
            assignments.forEach((assignment) => {
              if (assignment.AccountId && assignment.PermissionSetArn) {
                const accountId = assignment.AccountId;
                const existingRoles = accountAssignments.get(accountId) || [];
                existingRoles.push(assignment.PermissionSetArn);
                accountAssignments.set(accountId, existingRoles);
              }
            });
            
            // Create result for all accounts (including those without access)
            const accountAccess: CrossAccountUserAccess[] = [];
            
            // Add accounts with access
            accountAssignments.forEach((roles, accountId) => {
              accountAccess.push({
                accountId,
                accountName: accountMap.get(accountId) || accountId,
                hasAccess: true,
                accessType: 'SSO' as const,
                roles,
                lastChecked: new Date()
              });
            });
            
            // Add accounts without access (optional - you might want to only show accessible accounts)
            accounts.forEach(account => {
              if (!accountAssignments.has(account.id)) {
                accountAccess.push({
                  accountId: account.id,
                  accountName: account.name,
                  hasAccess: false,
                  accessType: 'SSO' as const,
                  roles: [],
                  lastChecked: new Date()
                });
              }
            });
            
            const accessibleCount = accountAccess.filter(a => a.hasAccess).length;
            console.log(`Found ${accessibleCount} accessible accounts out of ${accounts.length} total accounts for user ${userId}`);
            
            return accountAccess;
          })
          .catch(error => {
            console.error(`Error getting account assignments for user ${userId}:`, error);
            // Fallback to empty array or you could fallback to the old method
            return [];
          });
      })
      .catch(error => {
        console.error(`Error getting account access for user ${userId}:`, error);
        return [];
      });
  }

  /**
   * Get organization information
   */
  async getOrganizationInfo() {
    const command = new DescribeOrganizationCommand({});
    const response = await this.organizationsClient.send(command);
    return response.Organization;
  }

  /**
   * Fallback method: Get IAM users across organization accounts
   * This is used when IAM Identity Center is not available
   */
  async getOrganizationIAMUsers(): Promise<OrganizationUser[]> {
    console.log('Getting IAM users across organization accounts...');
    
    // Get all organization accounts
    return this.listOrganizationAccounts()
      .then(async accounts => {
        console.log(`Found ${accounts.length} organization accounts`);
        
        const currentAccount = await this.getAccountInfo();
        if (!currentAccount) {
          console.error('Could not get current account info');
          return [];
        }

        // Collect unique users across all accounts
        const userMap = new Map<string, { user: IdentityCenterUser; accountAccess: CrossAccountUserAccess[] }>();
        
        for (const account of accounts) {
          const iamClient = await this.getIAMClientForAccount(account.id);
          if (!iamClient) {
            console.log(`Cannot access account ${account.id}, skipping...`);
            continue;
          }

          console.log(`Checking IAM users in account: ${account.name} (${account.id})`);

          // List users in this account
          const listUsersCommand = new ListUsersCommand({});
          await iamClient.send(listUsersCommand)
            .then(usersResponse => {
              const accountUsers = usersResponse.Users || [];
              console.log(`Found ${accountUsers.length} IAM users in account ${account.name}`);

              for (const iamUser of accountUsers) {
                const userKey = iamUser.UserName || '';
                
                // Convert IAM user to IdentityCenterUser format for consistency
                const identityCenterUser: IdentityCenterUser = {
                  UserId: iamUser.UserId || '',
                  UserName: iamUser.UserName || '',
                  Name: {
                    Formatted: iamUser.UserName || ''
                  },
                  DisplayName: iamUser.UserName || '',
                  Emails: [], // IAM users don't have email in the same format
                  Active: true,
                  IdentityStoreId: account.id // Use account ID as identifier
                };

                if (!userMap.has(userKey)) {
                  userMap.set(userKey, {
                    user: identityCenterUser,
                    accountAccess: []
                  });
                }

                // Add access for this account
                const userEntry = userMap.get(userKey)!;
                userEntry.accountAccess.push({
                  accountId: account.id,
                  accountName: account.name,
                  hasAccess: true,
                  accessType: 'IAM' as const,
                  lastChecked: new Date()
                });
              }
            })
            .catch(error => {
              console.warn(`Error checking account ${account.id}:`, error);
              // Continue with other accounts
            });
        }

        // Convert map to array
        const organizationUsers: OrganizationUser[] = Array.from(userMap.values()).map(entry => ({
          user: entry.user,
          homeAccountId: currentAccount.accountId,
          accountAccess: entry.accountAccess
        }));

        console.log(`Found ${organizationUsers.length} unique IAM users across organization`);
        return organizationUsers;
      })
      .catch(error => {
        console.error('Error in getOrganizationIAMUsers:', error);
        return [];
      });
  }
}
