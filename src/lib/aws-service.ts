/**
 * @deprecated This file is being phased out in favor of modular services.
 * 
 * Please use the modular services from `/lib/aws-services/` instead:
 * - SimplifiedAWSService: Main orchestrator service
 * - AccountService: Account and STS operations (getAccountInfo, testConnection)
 * - OrganizationService: AWS Organizations operations (listAccounts, getOrganizationInfo)
 * - SSOService: SSO Admin operations (getPermissionSets, getPermissionSetDetails)
 * - UserService: IAM and Identity Center user operations (getIAMUsers, getIdentityCenterUsers)
 * 
 * Migration status:
 * ✅ All API routes have been migrated to use modular services
 * ⚠️ This file is kept for backward compatibility only
 * 🗑️ Will be removed in a future version
 */

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
  ListPermissionSetsCommand,
  DescribePermissionSetCommand,
  ListManagedPoliciesInPermissionSetCommand,
  GetInlinePolicyForPermissionSetCommand,
  ListCustomerManagedPolicyReferencesInPermissionSetCommand
} from '@aws-sdk/client-sso-admin';
import {
  IdentitystoreClient,
  ListUsersCommand as ListIdentityStoreUsersCommand
} from '@aws-sdk/client-identitystore';
import type { 
  UserPermissions, 
  AccountInfo, 
  IAMUser, 
  IdentityCenterUser,
  SSOInstance,
  OrganizationAccount, 
  CrossAccountUserAccess, 
  OrganizationUser,
  PermissionSetDetails,
  DetailedResourceAccess
} from '@/types/aws';

export class AWSService {
  private iamClient: IAMClient;
  private stsClient: STSClient;
  private organizationsClient: OrganizationsClient;
  private ssoAdminClient: SSOAdminClient;
  private identityStoreClient: IdentitystoreClient;
  private region: string;

  constructor(region = 'us-east-1', credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  }) {
    this.region = region;
    console.log(`Using AWS region: ${region}`);
    
    const clientConfig = credentials ? { region, credentials } : { region };
    
    this.iamClient = new IAMClient(clientConfig);
    this.stsClient = new STSClient(clientConfig);
    this.organizationsClient = new OrganizationsClient(clientConfig);
    this.ssoAdminClient = new SSOAdminClient(clientConfig);
    this.identityStoreClient = new IdentitystoreClient(clientConfig);
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
    const response = await this.organizationsClient.send(command).then(
      response => response,
      error => {
        console.log(`Cannot list organization accounts: ${error.message}`);
        return { Accounts: [] };
      }
    );
    
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
    const assumeRoleResponse = await this.stsClient.send(assumeRoleCommand).then(
      response => response,
      error => {
        console.log(`Cannot assume role in account ${accountId}: ${error.message}`);
        return null;
      }
    );
    
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
    const userResponse = await iamClient.send(getUserCommand).then(
      response => response,
      error => {
        if (error instanceof NoSuchEntityException) {
          // User doesn't exist in this account - this is expected
          return null;
        }
        // Re-throw other errors
        throw error;
      }
    );
    
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
      }, error => {
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
  async getOrganizationUsers(region?: string, includeIAMUsers = true): Promise<OrganizationUser[]> {
    console.log(`Fetching organization users in region: ${region || this.region}, includeIAMUsers: ${includeIAMUsers}`);
    
    // First try to get SSO users
    const ssoInstances = await this.getSSOInstances(region);
    const ssoUsers: OrganizationUser[] = [];
    
    for (const instance of ssoInstances) {
      // Get Identity Center users and convert to OrganizationUser format
      const identityCenterUsers = await this.getIdentityCenterUsers(instance.IdentityStoreId, region)
        .catch(error => {
          console.warn(`Failed to fetch SSO users for instance ${instance.InstanceArn}:`, error);
          return [];
        });
      
      const convertedUsers = identityCenterUsers.map(user => ({
        user: {
          ...user,
          DisplayName: user.DisplayName || user.Name?.Formatted || `${user.Name?.GivenName || ''} ${user.Name?.FamilyName || ''}`.trim(),
          Status: user.Active ? 'ACTIVE' : 'INACTIVE',
          Type: 'SSO' as const
        },
        homeAccountId: 'organization', // SSO users don't belong to a specific account
        accountAccess: [] // Will be populated when account access is needed
      }));
      ssoUsers.push(...convertedUsers);
    }

    console.log(`Found ${ssoUsers.length} SSO users`);

    // Only try to get IAM users if explicitly requested and no SSO users found
    if (includeIAMUsers && ssoUsers.length === 0) {
      console.log('No SSO users found, falling back to IAM users...');
      console.log('WARNING: This may fail if cross-account roles are not configured properly.');
      
      const iamUsers = await this.getOrganizationIAMUsers()
        .catch(error => {
          console.warn('Failed to fetch IAM users from organization accounts. This is normal if cross-account roles are not configured.', error);
          return [];
        });
      
      console.log(`Found ${iamUsers.length} IAM users across organization`);
      return [...ssoUsers, ...iamUsers];
    }

    return ssoUsers;
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
            }, error => {
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
      }, error => {
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
          
          const result = await ssoAdminClient.send(assignmentsCommand).then(
            response => {
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
                  
                  // Debug: log first few permission set ARNs for the first user
                  if (existingRoles.length <= 3 && userId === userIds[0]) {
                    console.log('Sample permission set ARN:', assignment.PermissionSetArn);
                  }
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
            },
            error => {
              console.error(`Error getting account assignments for user ${userId}:`, error);
              return { userId, success: false };
            }
          );
          
          return result;
        });
        
        const results = await Promise.all(assignmentPromises);
        const successCount = results.filter(r => r.success).length;
        console.log(`Successfully fetched access for ${successCount}/${userIds.length} users`);
        
        // Try to get permission set names for better service detection (lightweight call)
        const permissionSetNameMap = new Map<string, string>();
        
        const uniquePermissionSetArns = new Set<string>();
        userAccessMap.forEach(userAccess => {
          userAccess.forEach(access => {
            if (access.roles) {
              access.roles.forEach(arn => uniquePermissionSetArns.add(arn));
            }
          });
        });
        
        console.log(`Attempting to fetch names for ${uniquePermissionSetArns.size} unique permission sets`);
        
        // Use a more conservative approach - only fetch a few permission set names
        const sampleArns = Array.from(uniquePermissionSetArns).slice(0, 10);
        const namePromises = sampleArns.map(async (arn) => {
          const describeCommand = new DescribePermissionSetCommand({
            InstanceArn: ssoInstance.InstanceArn,
            PermissionSetArn: arn
          });
          
          return ssoAdminClient.send(describeCommand).then(
            response => {
              const name = response.PermissionSet?.Name || '';
              if (name) {
                permissionSetNameMap.set(arn, name);
              }
              return { arn, name };
            },
            error => {
              console.log(`Could not fetch name for permission set ${arn}:`, error);
              return { arn, name: '' };
            }
          );
        });
        
        // Diagnostic logging for permission set names
        await Promise.all(namePromises).then( 
          results => {
            console.log('Sample permission set names:', results);
            return true;
          },
          error => {
            console.log('Could not fetch permission set names:', error);
            return false;
          }
        );
        
        // Enhance the response with permission set names where available
        userAccessMap.forEach(userAccess => {
          userAccess.forEach(access => {
            if (access.roles) {
              access.permissionSets = access.roles.map(arn => ({
                name: permissionSetNameMap.get(arn) || arn.split('/').pop() || arn,
                arn: arn,
                description: permissionSetNameMap.get(arn) ? undefined : 'Name not available'
              }));
            }
          });
        });
        
        return userAccessMap;
      }, error => {
        console.error('Error getting bulk account access:', error);
        return new Map();
      });
  }

  /**
   * Get detailed information about a permission set including policies and permissions
   */
  async getPermissionSetDetails(instanceArn: string, permissionSetArn: string, ssoRegion?: string): Promise<PermissionSetDetails> {
    const ssoAdminClient = new SSOAdminClient({ region: ssoRegion || this.region });
    
    // Get basic permission set information
    const describeCommand = new DescribePermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    
    const permissionSetResponse = await ssoAdminClient.send(describeCommand);
    const permissionSet = permissionSetResponse.PermissionSet;
    
    if (!permissionSet) {
      throw new Error('Permission set not found');
    }

    const details: PermissionSetDetails = {
      name: permissionSet.Name || '',
      arn: permissionSetArn,
      description: permissionSet.Description,
      sessionDuration: permissionSet.SessionDuration,
      managedPolicies: [],
      customerManagedPolicies: []
    };

    // Get AWS managed policies
    const managedPoliciesCommand = new ListManagedPoliciesInPermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    
    const managedPoliciesResponse = await ssoAdminClient.send(managedPoliciesCommand);
    details.managedPolicies = managedPoliciesResponse.AttachedManagedPolicies?.map(p => p.Arn || '') || [];

    // Get customer managed policies
    const customerPoliciesCommand = new ListCustomerManagedPolicyReferencesInPermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    
    const customerPoliciesResponse = await ssoAdminClient.send(customerPoliciesCommand);
    details.customerManagedPolicies = customerPoliciesResponse.CustomerManagedPolicyReferences?.map(p => ({
      name: p.Name || '',
      path: p.Path || '/'
    })) || [];

    // Get inline policy
    const inlinePolicyCommand = new GetInlinePolicyForPermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    
    await ssoAdminClient.send(inlinePolicyCommand).then(
      inlinePolicyResponse => {
        details.inlinePolicyDocument = inlinePolicyResponse.InlinePolicy;
      },
      error => {
        // Inline policy might not exist, which is fine
        console.log('No inline policy found for permission set', error);
      }
    );
    
    return details;
  }

  /**
   * Get all permission sets from an SSO instance
   */
  async getPermissionSets(instanceArn: string): Promise<Array<{ arn: string; name: string; description?: string }>> {
    const ssoAdminClient = new SSOAdminClient({ region: this.region });
    
    // Get all permission sets with pagination
    const permissionSetArns: string[] = [];
    let nextToken: string | undefined;
    
    do {
      const permissionSetsCommand = new ListPermissionSetsCommand({
        InstanceArn: instanceArn,
        NextToken: nextToken
      });
      
      const permissionSetsResponse = await ssoAdminClient.send(permissionSetsCommand);
      permissionSetArns.push(...(permissionSetsResponse.PermissionSets || []));
      nextToken = permissionSetsResponse.NextToken;
    } while (nextToken);
    
    console.log(`Found ${permissionSetArns.length} permission sets`);
    
    // Get details for each permission set
    const permissionSetsWithDetails = await Promise.allSettled(
      permissionSetArns.map(async (arn) => {
        const describeCommand = new DescribePermissionSetCommand({
          InstanceArn: instanceArn,
          PermissionSetArn: arn
        });
        
        const response = await ssoAdminClient.send(describeCommand);
        return {
          arn,
          name: response.PermissionSet?.Name || '',
          description: response.PermissionSet?.Description
        };
      })
    );
    
    // Filter successful results and sort by name
    return permissionSetsWithDetails
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<{ arn: string; name: string; description?: string }>).value)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Parse policy document to extract detailed resource access information
   */
  async parseDetailedResourceAccess(policyDocument?: string, managedPolicyArns: string[] = []): Promise<DetailedResourceAccess[]> {
    const accessDetails: DetailedResourceAccess[] = [];

    // Parse inline policy if provided
    if (policyDocument) {
      const { safeAsync } = await import('./result');
      
      const jsonResult = await safeAsync(Promise.resolve(JSON.parse(policyDocument)));
      
      if (jsonResult.success && jsonResult.data?.Statement) {
        const policy = jsonResult.data;
        const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
        
        statements.forEach((statement: {
          Effect?: string;
          Action?: string | string[];
          Resource?: string | string[];
          Condition?: Record<string, unknown>;
        }) => {
          if (statement.Effect && statement.Action && statement.Resource) {
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            const resources = Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource];
            
            // Group by service
            const serviceGroups = new Map<string, { resources: Set<string>, actions: Set<string> }>();
            
            actions.forEach((action: string) => {
              const service = action.split(':')[0] || 'unknown';
              if (!serviceGroups.has(service)) {
                serviceGroups.set(service, { resources: new Set(), actions: new Set() });
              }
              serviceGroups.get(service)!.actions.add(action);
            });
            
            resources.forEach((resource: string) => {
              // Try to determine service from resource ARN
              let service = 'unknown';
              if (resource.startsWith('arn:aws:')) {
                service = resource.split(':')[2] || 'unknown';
              } else if (resource === '*') {
                // Add to all services
                serviceGroups.forEach((group) => {
                  group.resources.add(resource);
                });
                return;
              }
              
              if (serviceGroups.has(service)) {
                serviceGroups.get(service)!.resources.add(resource);
              } else {
                // Create new service group for this resource
                serviceGroups.set(service, { 
                  resources: new Set([resource]), 
                  actions: new Set(['*']) 
                });
              }
            });
            
            serviceGroups.forEach((group, service) => {
              accessDetails.push({
                service,
                resources: Array.from(group.resources),
                actions: Array.from(group.actions),
                effect: (statement.Effect as 'Allow' | 'Deny') || 'Allow',
                condition: statement.Condition
              });
            });
          }
        });
      }
    }

    // Parse managed policies (this would require additional API calls to get policy versions)
    // For now, just list the managed policies as high-level access
    managedPolicyArns.forEach(arn => {
      const policyName = arn.split('/').pop() || arn;
      let service = 'multiple';
      
      // Try to infer service from common AWS managed policy patterns
      if (policyName.includes('S3')) service = 's3';
      else if (policyName.includes('EC2')) service = 'ec2';
      else if (policyName.includes('Lambda')) service = 'lambda';
      else if (policyName.includes('DynamoDB')) service = 'dynamodb';
      else if (policyName.includes('RDS')) service = 'rds';
      else if (policyName.includes('IAM')) service = 'iam';
      else if (policyName.includes('CloudWatch')) service = 'cloudwatch';
      else if (policyName.includes('Admin')) service = 'multiple';
      
      accessDetails.push({
        service,
        resources: ['*'],
        actions: [policyName],
        effect: 'Allow'
      });
    });

    return accessDetails;
  }

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
          .then(async response => {
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
            
            // Add accounts with access and fetch detailed permission set information
            for (const [accountId, roles] of accountAssignments) {
              const permissionSets: PermissionSetDetails[] = [];
              let combinedDetailedAccess: DetailedResourceAccess[] = [];
              
              // Fetch detailed information for each permission set
              for (const permissionSetArn of roles) {
                const permissionSetResult = await this.getPermissionSetDetails(
                  ssoInstance.InstanceArn, 
                  permissionSetArn, 
                  ssoInstance.Region
                ).then(
                  details => ({ success: true, details }),
                  error => {
                    console.error(`Error fetching permission set details for ${permissionSetArn}:`, error);
                    return { success: false, details: null };
                  }
                );
                
                if (permissionSetResult.success && permissionSetResult.details) {
                  permissionSets.push(permissionSetResult.details);
                  
                  // Parse detailed access from this permission set
                  const detailedAccess = await this.parseDetailedResourceAccess(
                    permissionSetResult.details.inlinePolicyDocument,
                    permissionSetResult.details.managedPolicies
                  );
                  combinedDetailedAccess = combinedDetailedAccess.concat(detailedAccess);
                }
              }
              
              accountAccess.push({
                accountId,
                accountName: accountMap.get(accountId) || accountId,
                hasAccess: true,
                accessType: 'SSO' as const,
                roles,
                permissionSets,
                detailedAccess: combinedDetailedAccess,
                lastChecked: new Date()
              });
            }
            
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
          }, error => {
            console.error(`Error getting account assignments for user ${userId}:`, error);
            // Fallback to empty array or you could fallback to the old method
            return [];
          });
      }, error => {
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
            }, error => {
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
      }, error => {
        console.error('Error in getOrganizationIAMUsers:', error);
        return [];
      });
  }
}
