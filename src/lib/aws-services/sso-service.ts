import {
  SSOAdminClient,
  ListInstancesCommand,
  ListPermissionSetsCommand,
  DescribePermissionSetCommand,
  ListManagedPoliciesInPermissionSetCommand,
  GetInlinePolicyForPermissionSetCommand,
  ListAccountAssignmentsCommand,
  ListAccountAssignmentsForPrincipalCommand,
  ListCustomerManagedPolicyReferencesInPermissionSetCommand
} from '@aws-sdk/client-sso-admin';
import type { PermissionSetDetails, CrossAccountUserAccess, OrganizationAccount } from '@/types/aws';
import { safeAsync, type Result } from '@/lib/result';
import { Optional } from '@/lib/optional';
import { isThrottlingError } from '@/lib/utils/error-guards';
import type { AWSCredentials } from './account-service';

/**
 * Simplified service for SSO-related operations
 */
export class SSOService {
  private ssoAdminClient: SSOAdminClient;

  constructor(region?: string, credentials?: AWSCredentials) {
    this.ssoAdminClient = new SSOAdminClient({ 
      region: region || process.env.AWS_REGION || 'us-east-1',
      credentials: credentials || undefined
    });
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry logic with exponential backoff for throttling errors
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
  ): Promise<Result<T, Error>> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await safeAsync(fn());
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Check if it's a throttling error using type guard
      if (isThrottlingError(result.error)) {
        if (attempt < maxRetries) {
          const delayMs = initialDelay * Math.pow(2, attempt);
          console.log(`Throttled, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await this.delay(delayMs);
          continue;
        }
      } else {
        // Not a throttling error, don't retry
        return result;
      }
    }
    
    // lastError will always be defined here since we went through at least one iteration
    return { success: false, error: lastError! };
  }

  /**
   * Get all SSO instances in the current region
   */
  async getSSOInstances() {
    const command = new ListInstancesCommand({});
    const result = await safeAsync(this.ssoAdminClient.send(command));
    
    if (!result.success) {
      console.warn('Could not list SSO instances:', result.error);
      return [];
    }
    
    return (result.data.Instances || []).map(instance => ({
      InstanceArn: instance.InstanceArn!,
      IdentityStoreId: instance.IdentityStoreId!,
      Region: this.ssoAdminClient.config.region || 'us-east-1'
    }));
  }

  /**
   * Get all permission sets for an SSO instance
   */
  async getPermissionSets(instanceArn: string) {
    const command = new ListPermissionSetsCommand({ InstanceArn: instanceArn });
    const result = await safeAsync(this.ssoAdminClient.send(command));
    
    if (!result.success) {
      console.warn(`Could not list permission sets for ${instanceArn}:`, result.error);
      return [];
    }
    
    const permissionSetArns = result.data.PermissionSets || [];
    const permissionSets: Array<{ arn: string; name: string; description?: string }> = [];

    // Get details for each permission set with rate limiting
    for (const arn of permissionSetArns) {
      const details = await this.getPermissionSetDetailsWithRetry(instanceArn, arn);
      const optional = Optional.of(details);
      optional.ifPresent(d => {
        permissionSets.push({
          arn,
          name: d.name,
          description: d.description
        });
      });
      
      // Add delay to avoid rate limiting (200ms between calls)
      await this.delay(200);
    }

    return permissionSets;
  }

  /**
   * Get detailed information about a permission set with retry logic
   */
  private async getPermissionSetDetailsWithRetry(instanceArn: string, permissionSetArn: string): Promise<PermissionSetDetails | null> {
    const result = await this.retryWithBackoff(() => 
      this.getPermissionSetDetails(instanceArn, permissionSetArn)
    );
    
    if (!result.success) {
      console.warn(`Could not get details for permission set ${permissionSetArn}:`, result.error);
      return null;
    }
    
    return result.data;
  }

  /**
   * Get detailed information about a permission set
   */
  async getPermissionSetDetails(instanceArn: string, permissionSetArn: string): Promise<PermissionSetDetails | null> {
    // Get basic permission set details
    const describeCommand = new DescribePermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    
    const describeResult = await safeAsync(this.ssoAdminClient.send(describeCommand));
    
    if (!describeResult.success) {
      console.warn(`Failed to describe permission set ${permissionSetArn}:`, describeResult.error);
      return null;
    }
    
    const permissionSet = describeResult.data.PermissionSet;
    if (!permissionSet) return null;

    // Get managed policies
    const managedPoliciesCommand = new ListManagedPoliciesInPermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    const managedPoliciesResult = await safeAsync(this.ssoAdminClient.send(managedPoliciesCommand));
    const managedPolicies = managedPoliciesResult.success 
      ? (managedPoliciesResult.data.AttachedManagedPolicies || []).map(p => p.Arn!)
      : [];

    // Get customer managed policies
    const customerPoliciesCommand = new ListCustomerManagedPolicyReferencesInPermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    const customerPoliciesResult = await safeAsync(this.ssoAdminClient.send(customerPoliciesCommand));
    const customerManagedPolicies = customerPoliciesResult.success
      ? (customerPoliciesResult.data.CustomerManagedPolicyReferences?.map(p => ({
          name: p.Name || '',
          path: p.Path || '/'
        })) || [])
      : [];

    // Get inline policy
    const inlinePolicyCommand = new GetInlinePolicyForPermissionSetCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn
    });
    const inlinePolicyResult = await safeAsync(this.ssoAdminClient.send(inlinePolicyCommand));
    const inlinePolicyDocument = inlinePolicyResult.success 
      ? (inlinePolicyResult.data.InlinePolicy || undefined)
      : undefined;

    return {
      arn: permissionSetArn,
      name: permissionSet.Name!,
      description: permissionSet.Description,
      sessionDuration: permissionSet.SessionDuration,
      managedPolicies,
      customerManagedPolicies,
      inlinePolicyDocument
    };
  }

  /**
   * Get account access for a specific user
   */
  async getUserAccountAccess(
    userId: string, 
    instanceArn: string, 
    accounts: OrganizationAccount[]
  ): Promise<CrossAccountUserAccess[]> {
    console.log(`Getting account access for user: ${userId}`);
    
    const assignmentsCommand = new ListAccountAssignmentsForPrincipalCommand({
      InstanceArn: instanceArn,
      PrincipalType: 'USER',
      PrincipalId: userId
    });
    
    const result = await safeAsync(this.ssoAdminClient.send(assignmentsCommand));
    
    if (!result.success) {
      console.error(`Error getting account access for user ${userId}:`, result.error);
      return accounts.map(account => ({
        accountId: account.id,
        accountName: account.name,
        hasAccess: false,
        accessType: 'SSO' as const,
        lastChecked: new Date()
      }));
    }
    
    const assignments = result.data.AccountAssignments || [];
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
    
    // Create result for all accounts
    const accountAccess: CrossAccountUserAccess[] = accounts.map(account => {
      const roles = accountAssignments.get(account.id) || [];
      
      return {
        accountId: account.id,
        accountName: account.name,
        hasAccess: roles.length > 0,
        accessType: 'SSO' as const,
        roles: roles.length > 0 ? roles : undefined,
        lastChecked: new Date()
      };
    });
    
    return accountAccess;
  }

  /**
   * Get account access for multiple users in bulk
   */
  async getBulkUserAccountAccess(
    userIds: string[], 
    instanceArn: string, 
    accounts: OrganizationAccount[]
  ): Promise<Map<string, CrossAccountUserAccess[]>> {
    console.log(`Getting account access for ${userIds.length} users in bulk`);
    
    const userAccessMap = new Map<string, CrossAccountUserAccess[]>();
    
    // Initialize all users with empty access
    userIds.forEach(userId => {
      userAccessMap.set(userId, accounts.map(account => ({
        accountId: account.id,
        accountName: account.name,
        hasAccess: false,
        accessType: 'SSO' as const,
        lastChecked: new Date()
      })));
    });
    
    // Fetch assignments for all users in parallel
    const assignmentPromises = userIds.map(async (userId) => {
      const assignmentsCommand = new ListAccountAssignmentsForPrincipalCommand({
        InstanceArn: instanceArn,
        PrincipalType: 'USER',
        PrincipalId: userId
      });
      
      const result = await safeAsync(this.ssoAdminClient.send(assignmentsCommand));
      
      if (!result.success) {
        console.error(`Error getting account assignments for user ${userId}:`, result.error);
        return { userId, success: false };
      }
      
      const assignments = result.data.AccountAssignments || [];
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
    });
    
    const results = await Promise.all(assignmentPromises);
    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully fetched access for ${successCount}/${userIds.length} users`);
    
    // Try to enhance with permission set names (sample only for performance)
    const permissionSetNameMap = new Map<string, string>();
    const uniquePermissionSetArns = new Set<string>();
    
    userAccessMap.forEach(userAccess => {
      userAccess.forEach(access => {
        if (access.roles) {
          access.roles.forEach(arn => uniquePermissionSetArns.add(arn));
        }
      });
    });
    
    console.log(`Found ${uniquePermissionSetArns.size} unique permission sets`);
    
    // Only fetch names for a sample to avoid too many API calls
    const sampleArns = Array.from(uniquePermissionSetArns).slice(0, 10);
    const namePromises = sampleArns.map(async (arn) => {
      const describeCommand = new DescribePermissionSetCommand({
        InstanceArn: instanceArn,
        PermissionSetArn: arn
      });
      
      const result = await safeAsync(this.ssoAdminClient.send(describeCommand));
      
      if (!result.success) {
        console.log(`Could not fetch name for permission set ${arn}:`, result.error);
        return { arn, name: '' };
      }
      
      const name = result.data.PermissionSet?.Name || '';
      if (name) {
        permissionSetNameMap.set(arn, name);
      }
      return { arn, name };
    });
    
    await Promise.all(namePromises);
    
    // Enhance the response with permission set names where available
    userAccessMap.forEach(userAccess => {
      userAccess.forEach(access => {
        if (access.roles) {
          access.permissionSets = access.roles.map(arn => ({
            name: permissionSetNameMap.get(arn) || arn.split('/').pop() || arn,
            arn: arn
          }));
        }
      });
    });
    
    return userAccessMap;
  }

  /**
   * Get all assignments for a permission set
   * @private
   */
  private async getPermissionSetAssignments(instanceArn: string, permissionSetArn: string) {
    // Note: We'd need to iterate through all accounts to get all assignments
    // This is a simplified version that would need to be enhanced
    const command = new ListAccountAssignmentsCommand({
      InstanceArn: instanceArn,
      PermissionSetArn: permissionSetArn,
      AccountId: 'account-placeholder' // Would need actual account IDs
    });
    
    const result = await safeAsync(this.ssoAdminClient.send(command));
    
    if (!result.success) {
      console.warn(`Could not get assignments for permission set ${permissionSetArn}:`, result.error);
      return [];
    }
    
    // In a real implementation, you'd iterate through all organization accounts
    return [];
  }
}
