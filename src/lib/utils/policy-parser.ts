/**
 * Policy Parsing Utilities
 * 
 * Centralized utilities for parsing and validating AWS IAM policy documents.
 * Eliminates code duplication and provides consistent policy handling.
 */

import { safeSyncOperation, type Result } from '@/lib/result';
import type { IAMPolicyDocument, IAMPolicyStatement, PolicyPermission } from '@/types/aws';

/**
 * Type guard to check if a value is a valid IAM policy document
 */
export function isValidPolicyDocument(value: unknown): value is IAMPolicyDocument {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const policy = value as Record<string, unknown>;
  return 'Statement' in policy;
}

/**
 * Normalize a policy statement into a consistent permission format
 */
export function normalizeStatement(statement: IAMPolicyStatement): PolicyPermission {
  // Normalize actions
  const actions = statement.Action
    ? (Array.isArray(statement.Action) ? statement.Action : [statement.Action])
    : (statement.NotAction ? [] : ['*']);
  
  // Normalize resources
  const resources = statement.Resource
    ? (Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource])
    : (statement.NotResource ? ['*'] : ['*']);
  
  return {
    effect: statement.Effect || 'Allow',
    actions,
    resources,
    conditions: statement.Condition as Record<string, unknown> | undefined
  };
}

/**
 * Parse a URL-encoded policy document string into permissions
 * 
 * @param policyDocument - URL-encoded JSON policy document
 * @returns Array of normalized permissions or empty array on error
 */
export function parsePolicyDocument(policyDocument: string): Result<PolicyPermission[], Error> {
  // Decode URI component
  const decodeResult = safeSyncOperation(() => decodeURIComponent(policyDocument));
  if (!decodeResult.success) {
    return {
      success: false,
      error: new Error(`Failed to decode policy document: ${decodeResult.error.message}`)
    };
  }
  
  // Parse JSON
  const parseResult = safeSyncOperation<unknown>(() => JSON.parse(decodeResult.data));
  if (!parseResult.success) {
    return {
      success: false,
      error: new Error(`Failed to parse policy JSON: ${parseResult.error.message}`)
    };
  }
  
  // Validate policy document structure
  if (!isValidPolicyDocument(parseResult.data)) {
    return {
      success: false,
      error: new Error('Invalid policy document structure - missing Statement property')
    };
  }
  
  const policy = parseResult.data;
  const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
  
  return {
    success: true,
    data: statements.map(statement => normalizeStatement(statement))
  };
}

/**
 * Parse a policy document object (already decoded and parsed)
 * 
 * @param policyObject - Pre-parsed policy document object
 * @returns Array of normalized permissions
 */
export function parsePolicyObject(policyObject: IAMPolicyDocument): PolicyPermission[] {
  const statements = Array.isArray(policyObject.Statement) 
    ? policyObject.Statement 
    : [policyObject.Statement];
  
  return statements.map(statement => normalizeStatement(statement));
}

/**
 * Extract actions from a policy document
 * 
 * @param policyDocument - Policy document string or object
 * @returns Set of unique actions
 */
export function extractActionsFromPolicy(
  policyDocument: string | IAMPolicyDocument
): Result<Set<string>, Error> {
  let permissions: PolicyPermission[];
  
  if (typeof policyDocument === 'string') {
    const result = parsePolicyDocument(policyDocument);
    if (!result.success) {
      return result;
    }
    permissions = result.data;
  } else {
    permissions = parsePolicyObject(policyDocument);
  }
  
  const actions = new Set<string>();
  permissions.forEach(permission => {
    permission.actions.forEach(action => actions.add(action));
  });
  
  return {
    success: true,
    data: actions
  };
}

/**
 * Check if a policy grants a specific action
 * 
 * @param policyDocument - Policy document to check
 * @param actionToCheck - Action to look for (supports wildcards)
 * @returns True if policy allows the action
 */
export function policyAllowsAction(
  policyDocument: string | IAMPolicyDocument,
  actionToCheck: string
): boolean {
  const actionsResult = extractActionsFromPolicy(policyDocument);
  if (!actionsResult.success) {
    return false;
  }
  
  const actions = actionsResult.data;
  
  // Check for exact match
  if (actions.has(actionToCheck)) {
    return true;
  }
  
  // Check for wildcard matches
  const [service, action] = actionToCheck.split(':');
  if (actions.has(`${service}:*`) || actions.has('*')) {
    return true;
  }
  
  // Check for partial wildcards
  for (const policyAction of actions) {
    if (policyAction.includes('*')) {
      const pattern = new RegExp('^' + policyAction.replace('*', '.*') + '$');
      if (pattern.test(actionToCheck)) {
        return true;
      }
    }
  }
  
  return false;
}
