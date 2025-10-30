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

/**
 * Simplified service for SSO-related operations
 */
export class SSOService {
  private ssoAdminClient: SSOAdminClient;

  constructor(region?: string) {
    this.ssoAdminClient = new SSOAdminClient({ 
      region: region || process.env.AWS_REGION || 'us-east-1' 
    });
  }

  /**
   * Get all SSO instances in the current region
   */
  async getSSOInstances() {
    try {
      const command = new ListInstancesCommand({});
      const response = await this.ssoAdminClient.send(command);
      
      return (response.Instances || []).map(instance => ({
        InstanceArn: instance.InstanceArn!,
        IdentityStoreId: instance.IdentityStoreId!,
        Region: this.ssoAdminClient.config.region || 'us-east-1'
      }));
    } catch (error) {
      console.warn('Could not list SSO instances:', error);
      return [];
    }
  }

  /**
   * Get all permission sets for an SSO instance
   */
  async getPermissionSets(instanceArn: string) {
    try {
      const command = new ListPermissionSetsCommand({ InstanceArn: instanceArn });
      const response = await this.ssoAdminClient.send(command);
      
      const permissionSetArns = response.PermissionSets || [];
      const permissionSets = [];

      // Get details for each permission set
      for (const arn of permissionSetArns) {
        const details = await this.getPermissionSetDetails(instanceArn, arn);
        if (details) {
          permissionSets.push({
            arn,
            name: details.name,
            description: details.description
          });
        }
      }

      return permissionSets;
    } catch (error) {
      console.warn(`Could not list permission sets for ${instanceArn}:`, error);
      return [];
    }
  }

  /**
   * Get detailed information about a permission set
   */
  async getPermissionSetDetails(instanceArn: string, permissionSetArn: string): Promise<PermissionSetDetails | null> {
    try {
      // Get basic permission set details
      const describeCommand = new DescribePermissionSetCommand({
        InstanceArn: instanceArn,
        PermissionSetArn: permissionSetArn
      });
      const describeResponse = await this.ssoAdminClient.send(describeCommand);
      const permissionSet = describeResponse.PermissionSet;

      if (!permissionSet) return null;

      // Get managed policies
      const managedPoliciesCommand = new ListManagedPoliciesInPermissionSetCommand({
        InstanceArn: instanceArn,
        PermissionSetArn: permissionSetArn
      });
      const managedPoliciesResponse = await this.ssoAdminClient.send(managedPoliciesCommand);

      // Get customer managed policies
      let customerManagedPolicies: Array<{ name: string; path: string }> = [];
      try {
        const customerPoliciesCommand = new ListCustomerManagedPolicyReferencesInPermissionSetCommand({
          InstanceArn: instanceArn,
          PermissionSetArn: permissionSetArn
        });
        const customerPoliciesResponse = await this.ssoAdminClient.send(customerPoliciesCommand);
        customerManagedPolicies = customerPoliciesResponse.CustomerManagedPolicyReferences?.map(p => ({
          name: p.Name || '',
          path: p.Path || '/'
        })) || [];
      } catch {
        // No customer managed policies or access denied
      }

      // Get inline policy
      let inlinePolicyDocument = null;
      try {
        const inlinePolicyCommand = new GetInlinePolicyForPermissionSetCommand({
          InstanceArn: instanceArn,
          PermissionSetArn: permissionSetArn
        });
        const inlinePolicyResponse = await this.ssoAdminClient.send(inlinePolicyCommand);
        inlinePolicyDocument = inlinePolicyResponse.InlinePolicy || null;
      } catch {
        // No inline policy or access denied
      }

      return {
        arn: permissionSetArn,
        name: permissionSet.Name!,
        description: permissionSet.Description,
        sessionDuration: permissionSet.SessionDuration,
        managedPolicies: (managedPoliciesResponse.AttachedManagedPolicies || []).map(p => p.Arn!),
        customerManagedPolicies,
        inlinePolicyDocument: inlinePolicyDocument || undefined
      };
    } catch (error) {
      console.warn(`Could not get details for permission set ${permissionSetArn}:`, error);
      return null;
    }
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
    
    try {
      const assignmentsCommand = new ListAccountAssignmentsForPrincipalCommand({
        InstanceArn: instanceArn,
        PrincipalType: 'USER',
        PrincipalId: userId
      });
      
      const response = await this.ssoAdminClient.send(assignmentsCommand);
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
      
      // Create account map for names
      const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));
      
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
    } catch (error) {
      console.error(`Error getting account access for user ${userId}:`, error);
      return accounts.map(account => ({
        accountId: account.id,
        accountName: account.name,
        hasAccess: false,
        accessType: 'SSO' as const,
        lastChecked: new Date()
      }));
    }
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
        roles: [],
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
      
      try {
        const response = await this.ssoAdminClient.send(assignmentsCommand);
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
      try {
        const describeCommand = new DescribePermissionSetCommand({
          InstanceArn: instanceArn,
          PermissionSetArn: arn
        });
        const response = await this.ssoAdminClient.send(describeCommand);
        const name = response.PermissionSet?.Name || '';
        if (name) {
          permissionSetNameMap.set(arn, name);
        }
        return { arn, name };
      } catch (error) {
        console.log(`Could not fetch name for permission set ${arn}:`, error);
        return { arn, name: '' };
      }
    });
    
    await Promise.all(namePromises);
    
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
  }

  /**
   * Get all assignments for a permission set
   */
  private async getPermissionSetAssignments(instanceArn: string, permissionSetArn: string) {
    try {
      // Note: We'd need to iterate through all accounts to get all assignments
      // This is a simplified version that would need to be enhanced
      await new ListAccountAssignmentsCommand({
        InstanceArn: instanceArn,
        PermissionSetArn: permissionSetArn,
        AccountId: 'account-placeholder' // Would need actual account IDs
      });
      
      // In a real implementation, you'd iterate through all organization accounts
      return [];
    } catch (error) {
      console.warn(`Could not get assignments for permission set ${permissionSetArn}:`, error);
      return [];
    }
  }
}
