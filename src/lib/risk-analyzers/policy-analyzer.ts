import type {
  RiskFinding,
  RiskLevel,
  RiskCategory,
  PolicyAnalysisResult
} from '@/types/risk-analysis';
import {
  SENSITIVE_ACTIONS
} from '@/types/risk-analysis';

/**
 * Simple policy analyzer focused on analyzing individual policies
 */
export class PolicyAnalyzer {
  private generateFindingId(): string {
    return `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Analyze an AWS managed policy for risks
   */
  async analyzeManagedPolicy(policyArn: string): Promise<PolicyAnalysisResult> {
    const policyName = this.extractPolicyNameFromArn(policyArn);
    const findings: RiskFinding[] = [];
    
    const adminPermissions = this.isAdminPolicy(policyArn);
    const wildcardActionsCount = adminPermissions ? 1 : 0;
    const servicePermissions = this.extractServicesFromPolicyName(policyName);

    // Add findings for high-risk policies
    if (adminPermissions) {
      findings.push(this.createAdminAccessFinding(policyArn, policyName));
    }

    if (this.isPowerUserPolicy(policyArn)) {
      findings.push(this.createPowerUserFinding(policyArn, policyName));
    }

    return {
      policyArn,
      policyName,
      policyDocument: null,
      findings,
      permissionsCount: 0,
      wildcardActionsCount,
      adminPermissions,
      crossAccountAccess: false,
      dataAccessPermissions: [],
      servicePermissions
    };
  }

  /**
   * Analyze an inline policy document for risks
   */
  async analyzeInlinePolicy(policyDocument: string, policyName: string): Promise<PolicyAnalysisResult> {
    const findings: RiskFinding[] = [];
    const servicePermissions: Record<string, string[]> = {};
    const dataAccessPermissions: string[] = [];
    
    let totalPermissions = 0;
    let wildcardActionsCount = 0;
    let adminPermissions = false;
    const crossAccountAccess = false;

    const policy = this.parsePolicyDocument(policyDocument);
    if (!policy?.Statement) {
      return this.createEmptyAnalysisResult(policyName);
    }

    const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];

    for (const statement of statements) {
      if (!statement || typeof statement !== 'object' || statement.Effect !== 'Allow') continue;

      const statementObj = statement as Record<string, unknown>;
      const actions = this.normalizeToArray(statementObj.Action);
      const resources = this.normalizeToArray(statementObj.Resource);

      totalPermissions += actions.length;

      // Analyze actions for risks
      for (const action of actions) {
        this.analyzeAction(action, statementObj, findings, servicePermissions, policyName);
        
        if (action === '*') {
          adminPermissions = true;
          wildcardActionsCount++;
        }
        
        if (action.endsWith('*')) {
          wildcardActionsCount++;
        }
      }

      // Check for overly broad resource access
      if (resources.includes('*')) {
        findings.push(this.createWildcardResourceFinding(statementObj, policyName));
      }
    }

    return {
      policyName,
      policyDocument: policy,
      findings,
      permissionsCount: totalPermissions,
      wildcardActionsCount,
      adminPermissions,
      crossAccountAccess,
      dataAccessPermissions,
      servicePermissions
    };
  }

  // Helper methods
  private extractPolicyNameFromArn(policyArn: string): string {
    return policyArn.split('/').pop() || policyArn;
  }

  private isAdminPolicy(policyArn: string): boolean {
    return policyArn.includes('AdministratorAccess');
  }

  private isPowerUserPolicy(policyArn: string): boolean {
    return policyArn.includes('PowerUserAccess');
  }

  /**
   * Safe wrapper for synchronous operations that may throw
   */
  private safeSyncOperation<T>(operation: () => T): { success: true; data: T } | { success: false; error: any } {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }

  private parsePolicyDocument(policyDocument: string): Record<string, unknown> | null {
    const result = this.safeSyncOperation(() => JSON.parse(policyDocument));
    return result.success ? result.data : null;
  }

  private normalizeToArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return typeof value === 'string' ? [value] : [];
  }

  private createEmptyAnalysisResult(policyName: string): PolicyAnalysisResult {
    return {
      policyName,
      policyDocument: null,
      findings: [],
      permissionsCount: 0,
      wildcardActionsCount: 0,
      adminPermissions: false,
      crossAccountAccess: false,
      dataAccessPermissions: [],
      servicePermissions: {}
    };
  }

  private createAdminAccessFinding(policyArn: string, policyName: string): RiskFinding {
    return {
      id: this.generateFindingId(),
      title: 'Administrator Access Policy',
      description: 'Policy grants full administrative access to all AWS services',
      riskLevel: 'CRITICAL' as RiskLevel,
      category: 'ADMINISTRATIVE_ACCESS' as RiskCategory,
      severity: 10,
      impact: 'Complete control over AWS account and all resources',
      recommendation: 'Restrict administrative access to specific users and use temporary elevation when possible',
      resourceType: 'POLICY',
      resourceArn: policyArn,
      resourceName: policyName,
      details: { policyType: 'AWS_MANAGED' },
      createdAt: new Date()
    };
  }

  private createPowerUserFinding(policyArn: string, policyName: string): RiskFinding {
    return {
      id: this.generateFindingId(),
      title: 'Power User Access Policy',
      description: 'Policy grants broad access excluding IAM management',
      riskLevel: 'HIGH' as RiskLevel,
      category: 'OVERLY_PERMISSIVE' as RiskCategory,
      severity: 7,
      impact: 'Extensive access to AWS services with limited restrictions',
      recommendation: 'Consider more specific policies based on actual job requirements',
      resourceType: 'POLICY',
      resourceArn: policyArn,
      resourceName: policyName,
      details: { policyType: 'AWS_MANAGED' },
      createdAt: new Date()
    };
  }

  private createWildcardResourceFinding(statement: Record<string, unknown>, policyName: string): RiskFinding {
    return {
      id: this.generateFindingId(),
      title: 'Wildcard Resource Access',
      description: 'Policy grants access to all resources (*)',
      riskLevel: 'HIGH' as RiskLevel,
      category: 'OVERLY_PERMISSIVE' as RiskCategory,
      severity: 7,
      impact: 'Actions can be performed on any resource in the account',
      recommendation: 'Specify explicit resource ARNs or use resource patterns',
      resourceType: 'POLICY',
      resourceName: policyName,
      details: { statement },
      createdAt: new Date()
    };
  }

  private analyzeAction(
    action: string, 
    statement: Record<string, unknown>, 
    findings: RiskFinding[], 
    servicePermissions: Record<string, string[]>,
    policyName: string
  ): void {
    // Check for sensitive actions
    const allSensitiveActions = [
      ...SENSITIVE_ACTIONS.ADMIN_ACTIONS,
      ...SENSITIVE_ACTIONS.DATA_ACTIONS,
      ...SENSITIVE_ACTIONS.ESCALATION_ACTIONS,
      ...SENSITIVE_ACTIONS.DESTRUCTIVE_ACTIONS
    ];
    
    if (allSensitiveActions.includes(action)) {
      findings.push({
        id: this.generateFindingId(),
        title: 'Sensitive Action Detected',
        description: `Policy allows sensitive action: ${action}`,
        riskLevel: 'MEDIUM' as RiskLevel,
        category: 'DATA_EXPOSURE' as RiskCategory,
        severity: 6,
        impact: 'User can delete or modify critical resources',
        recommendation: 'Add conditions or move to break-glass access pattern',
        resourceType: 'POLICY',
        resourceName: policyName,
        details: { action, statement },
        createdAt: new Date()
      });
    }

    // Group actions by service
    const service = action.split(':')[0];
    if (!servicePermissions[service]) {
      servicePermissions[service] = [];
    }
    servicePermissions[service].push(action);
  }

  private extractServicesFromPolicyName(policyName: string): Record<string, string[]> {
    const servicePermissions: Record<string, string[]> = {};
    const nameLower = policyName.toLowerCase();

    const servicePatterns = [
      { pattern: /s3/, service: 's3', actions: ['s3:*'] },
      { pattern: /ec2/, service: 'ec2', actions: ['ec2:*'] },
      { pattern: /iam/, service: 'iam', actions: ['iam:*'] },
      { pattern: /lambda/, service: 'lambda', actions: ['lambda:*'] },
      { pattern: /rds/, service: 'rds', actions: ['rds:*'] },
      { pattern: /dynamodb/, service: 'dynamodb', actions: ['dynamodb:*'] },
      { pattern: /cloudformation/, service: 'cloudformation', actions: ['cloudformation:*'] },
      { pattern: /cloudwatch/, service: 'cloudwatch', actions: ['cloudwatch:*'] }
    ];

    for (const { pattern, service, actions } of servicePatterns) {
      if (pattern.test(nameLower)) {
        servicePermissions[service] = actions;
      }
    }

    return servicePermissions;
  }
}
