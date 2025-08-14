/**
 * Utility functions for extracting services from permission set ARNs
 */

export interface ServicePattern {
  pattern: RegExp;
  service: string;
}

const SERVICE_PATTERNS: ServicePattern[] = [
  // Infrastructure & Core
  { pattern: /infra|infrastructure/, service: 'ec2' },
  { pattern: /network|networking|vpc/, service: 'ec2' },
  { pattern: /compute/, service: 'ec2' },
  
  // Storage
  { pattern: /storage|s3|bucket/, service: 's3' },
  
  // Database
  { pattern: /database|db|rds/, service: 'rds' },
  
  // Security & Identity
  { pattern: /security|iam|identity/, service: 'iam' },
  { pattern: /src|source/, service: 'iam' },
  
  // Serverless
  { pattern: /lambda|function|serverless/, service: 'lambda' },
  
  // DevOps & Monitoring
  { pattern: /cloudformation|cfn|stack/, service: 'cloudformation' },
  { pattern: /cloudwatch|monitoring|logs/, service: 'cloudwatch' },
  { pattern: /devops|cicd|pipeline/, service: 'cloudformation' },
  
  // Messaging
  { pattern: /sns|notification/, service: 'sns' },
  { pattern: /sqs|queue/, service: 'sqs' },
  
  // Finance & Billing
  { pattern: /finance|billing|cost/, service: 'cloudwatch' }
];

const ROLE_TYPE_PATTERNS = [
  { pattern: /admin|administrator/, services: ['iam', 'ec2', 's3'] },
  { pattern: /power|poweruser/, services: ['ec2', 's3', 'lambda'] },
  { pattern: /developer|dev/, services: ['lambda', 's3', 'cloudformation'] },
  { pattern: /readonly|read/, services: ['cloudwatch'] }
];

/**
 * Extract services from permission set ARN or name
 */
export function extractServicesFromPermissionSet(permissionSetArn: string): string[] {
  const services: string[] = [];
  const arnLower = permissionSetArn.toLowerCase();
  
  // Extract from ARN path (usually the permission set name)
  const arnParts = permissionSetArn.split('/');
  const permissionSetName = arnParts[arnParts.length - 1] || '';
  const nameLower = permissionSetName.toLowerCase();
  
  // Check both ARN and name for service patterns
  const searchText = `${arnLower} ${nameLower}`;
  
  SERVICE_PATTERNS.forEach(({ pattern, service }) => {
    if (pattern.test(searchText)) {
      services.push(service);
    }
  });
  
  // Role type detection for generic permissions
  if (services.length === 0) {
    ROLE_TYPE_PATTERNS.forEach(({ pattern, services: roleServices }) => {
      if (pattern.test(searchText)) {
        services.push(...roleServices);
      }
    });
  }
  
  // For opaque permission set IDs, provide common AWS services as fallback
  if (services.length === 0 && permissionSetArn.includes('permissionSet/')) {
    return ['s3', 'ec2', 'iam'];
  }
  
  return [...new Set(services)]; // Remove duplicates
}

/**
 * Get estimated services based on user's permission count
 */
export function getEstimatedServices(totalPermissionSets: number): string[] {
  const baseServices = ['s3', 'ec2'];
  
  if (totalPermissionSets >= 5) {
    return [...baseServices, 'iam', 'lambda', 'rds'];
  } else if (totalPermissionSets >= 3) {
    return [...baseServices, 'iam', 'lambda'];
  } else if (totalPermissionSets >= 1) {
    return [...baseServices, 'iam'];
  }
  
  return baseServices;
}
