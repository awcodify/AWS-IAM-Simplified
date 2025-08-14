// Risk analysis types for IAM permission analysis

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface RiskFinding {
  id: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  category: RiskCategory;
  severity: number; // 1-10 scale
  impact: string;
  recommendation: string;
  resourceType: 'USER' | 'PERMISSION_SET' | 'POLICY' | 'ACCOUNT';
  resourceArn?: string;
  resourceName?: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

export type RiskCategory = 
  | 'OVERLY_PERMISSIVE'
  | 'PRIVILEGE_ESCALATION'
  | 'DATA_EXPOSURE' 
  | 'SECURITY_MISCONFIGURATION'
  | 'COMPLIANCE_VIOLATION'
  | 'UNUSED_PERMISSIONS'
  | 'ADMINISTRATIVE_ACCESS'
  | 'CROSS_ACCOUNT_ACCESS'
  | 'SERVICE_SPECIFIC';

export interface PolicyAnalysisResult {
  policyArn?: string;
  policyName: string;
  policyDocument: Record<string, unknown> | null;
  findings: RiskFinding[];
  permissionsCount: number;
  wildcardActionsCount: number;
  adminPermissions: boolean;
  crossAccountAccess: boolean;
  dataAccessPermissions: string[];
  servicePermissions: Record<string, string[]>;
}

export interface UserRiskProfile {
  userId: string;
  userName: string;
  displayName?: string;
  overallRiskScore: number; // 1-10 scale
  riskLevel: RiskLevel;
  findings: RiskFinding[];
  accountAccess: AccountRiskSummary[];
  totalPermissionSets: number;
  adminAccess: boolean;
  crossAccountAccess: boolean;
  unusedPermissions: number;
  lastAnalyzed: Date;
}

export interface PermissionSetRiskProfile {
  permissionSetArn: string;
  permissionSetName: string;
  description?: string;
  overallRiskScore: number; // 1-10 scale
  riskLevel: RiskLevel;
  findings: RiskFinding[];
  policyAnalysis: PolicyAnalysisResult[];
  adminAccess: boolean;
  wildcardActions: number;
  sensitiveServices: string[];
  lastAnalyzed: Date;
}

export interface AccountRiskSummary {
  accountId: string;
  accountName?: string;
  riskScore: number;
  findings: RiskFinding[];
  permissionSets: PermissionSetRisk[];
  adminAccess: boolean;
}

export interface PermissionSetRisk {
  arn: string;
  name: string;
  riskScore: number;
  riskLevel: RiskLevel;
  findings: RiskFinding[];
  policyAnalysis: PolicyAnalysisResult[];
  adminPermissions: boolean;
  wildcardActions: number;
  sensitiveServices: string[];
}

export interface RiskAnalysisOptions {
  includeUnusedPermissions?: boolean;
  includeLowRiskFindings?: boolean;
  checkCompliance?: boolean;
  customRules?: Array<{
    id: string;
    name: string;
    severity: number;
    condition: (data: unknown) => boolean;
  }>;
}

export interface RiskContext {
  user?: unknown;
  permissionSet?: unknown;
  account?: unknown;
  policies?: unknown[];
}

export interface CustomRiskRule {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  category: RiskCategory;
  condition: (context: RiskContext) => boolean;
  recommendation: string;
}

export interface RiskDashboardSummary {
  totalUsers: number;
  criticalFindings: number;
  highRiskUsers: number;
  adminUsers: number;
  crossAccountUsers: number;
  findingsByCategory: Record<RiskCategory, number>;
  findingsByRiskLevel: Record<RiskLevel, number>;
  trends: {
    newFindings: number;
    resolvedFindings: number;
    riskScoreChange: number;
  };
}

// Predefined sensitive actions that require special attention
export const SENSITIVE_ACTIONS = {
  // Administrative actions
  ADMIN_ACTIONS: [
    '*',
    'iam:*',
    'organizations:*',
    'account:*',
    'billing:*',
    'support:*'
  ],
  
  // Data access actions
  DATA_ACTIONS: [
    's3:GetObject',
    's3:GetBucketAcl',
    's3:GetBucketPolicy',
    'dynamodb:GetItem',
    'dynamodb:Query',
    'dynamodb:Scan',
    'rds:DescribeDBInstances',
    'secretsmanager:GetSecretValue',
    'ssm:GetParameter',
    'ssm:GetParametersByPath'
  ],
  
  // Privilege escalation risks
  ESCALATION_ACTIONS: [
    'iam:CreateRole',
    'iam:AttachRolePolicy',
    'iam:PutRolePolicy',
    'iam:AssumeRole',
    'iam:PassRole',
    'sts:AssumeRole',
    'lambda:InvokeFunction',
    'lambda:CreateFunction',
    'ec2:RunInstances'
  ],
  
  // Network and security
  NETWORK_ACTIONS: [
    'ec2:AuthorizeSecurityGroupIngress',
    'ec2:CreateSecurityGroup',
    'ec2:ModifyVpcAttribute',
    'route53:ChangeResourceRecordSets'
  ],
  
  // Destructive actions
  DESTRUCTIVE_ACTIONS: [
    's3:DeleteBucket',
    's3:DeleteObject',
    'dynamodb:DeleteTable',
    'rds:DeleteDBInstance',
    'ec2:TerminateInstances',
    'cloudformation:DeleteStack'
  ]
};

// Services that handle sensitive data
export const SENSITIVE_SERVICES = [
  'secretsmanager',
  'ssm', // Systems Manager Parameter Store
  'kms',
  'certificatemanager',
  's3',
  'dynamodb',
  'rds',
  'redshift',
  'elasticsearch',
  'opensearch'
];

// AWS managed policies that grant high privileges
export const HIGH_PRIVILEGE_POLICIES = [
  'arn:aws:iam::aws:policy/AdministratorAccess',
  'arn:aws:iam::aws:policy/PowerUserAccess',
  'arn:aws:iam::aws:policy/IAMFullAccess',
  'arn:aws:iam::aws:policy/SecurityAudit',
  'arn:aws:iam::aws:policy/ReadOnlyAccess',
  'arn:aws:iam::aws:policy/job-function/SystemAdministrator',
  'arn:aws:iam::aws:policy/job-function/NetworkAdministrator',
  'arn:aws:iam::aws:policy/job-function/DatabaseAdministrator'
];
