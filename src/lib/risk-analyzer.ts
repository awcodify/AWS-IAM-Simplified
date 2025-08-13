import type {
  RiskFinding,
  RiskLevel,
  RiskCategory,
  PolicyAnalysisResult,
  UserRiskProfile,
  PermissionSetRisk,
  RiskAnalysisOptions
} from '@/types/risk-analysis';
import {
  SENSITIVE_ACTIONS,
  SENSITIVE_SERVICES,
  HIGH_PRIVILEGE_POLICIES
} from '@/types/risk-analysis';
import type { OrganizationUser, PermissionSetDetails, CrossAccountUserAccess } from '@/types/aws';

export class IAMRiskAnalyzer {
  private generateFindingId(): string {
    return `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Analyze a user's risk profile across all their access
   */
  async analyzeUserRisk(
    user: OrganizationUser,
    options: RiskAnalysisOptions = {}
  ): Promise<UserRiskProfile> {
    const findings: RiskFinding[] = [];
    let overallRiskScore = 0;
    let adminAccess = false;
    let crossAccountAccess = false;

    // Analyze each account access
    const accountRiskSummaries = [];
    
    for (const accountAccess of user.accountAccess || []) {
      if (!accountAccess.hasAccess) continue;

      const accountFindings: RiskFinding[] = [];
      const permissionSetRisks: PermissionSetRisk[] = [];

      // Check if user has cross-account access
      if (accountAccess.accountId !== user.homeAccountId) {
        crossAccountAccess = true;
        accountFindings.push({
          id: this.generateFindingId(),
          title: 'Cross-Account Access Detected',
          description: `User has access to account ${accountAccess.accountId} which is different from their home account ${user.homeAccountId}`,
          riskLevel: 'MEDIUM' as RiskLevel,
          category: 'CROSS_ACCOUNT_ACCESS' as RiskCategory,
          severity: 6,
          impact: 'User can access resources across multiple AWS accounts',
          recommendation: 'Review cross-account access necessity and ensure principle of least privilege',
          resourceType: 'USER',
          resourceName: user.user.UserName,
          details: {
            homeAccountId: user.homeAccountId,
            accessAccountId: accountAccess.accountId,
            accessType: accountAccess.accessType
          },
          createdAt: new Date()
        });
      }

      // Analyze permission sets
      if (accountAccess.permissionSets) {
        for (const permissionSet of accountAccess.permissionSets) {
          const permissionSetRisk = await this.analyzePermissionSetRisk(permissionSet, accountAccess.accountId);
          permissionSetRisks.push(permissionSetRisk);
          
          if (permissionSetRisk.adminPermissions) {
            adminAccess = true;
          }
          
          findings.push(...permissionSetRisk.findings);
        }
      }

      // Calculate account risk score
      const accountRiskScore = this.calculateAccountRiskScore(permissionSetRisks, accountFindings);
      
      accountRiskSummaries.push({
        accountId: accountAccess.accountId,
        accountName: accountAccess.accountName,
        riskScore: accountRiskScore,
        findings: accountFindings,
        permissionSets: permissionSetRisks,
        adminAccess: permissionSetRisks.some(ps => ps.adminPermissions)
      });

      overallRiskScore = Math.max(overallRiskScore, accountRiskScore);
    }

    // Add user-level findings
    if (adminAccess) {
      findings.push({
        id: this.generateFindingId(),
        title: 'Administrative Access Detected',
        description: 'User has administrative privileges in one or more accounts',
        riskLevel: 'HIGH' as RiskLevel,
        category: 'ADMINISTRATIVE_ACCESS' as RiskCategory,
        severity: 8,
        impact: 'User has broad administrative control over AWS resources',
        recommendation: 'Regularly review administrative access and consider using temporary elevated access patterns',
        resourceType: 'USER',
        resourceName: user.user.UserName,
        details: { adminAccess: true },
        createdAt: new Date()
      });
    }

    if (crossAccountAccess) {
      findings.push({
        id: this.generateFindingId(),
        title: 'Multi-Account Access',
        description: 'User has access to multiple AWS accounts',
        riskLevel: 'MEDIUM' as RiskLevel,
        category: 'CROSS_ACCOUNT_ACCESS' as RiskCategory,
        severity: 5,
        impact: 'Potential for lateral movement across account boundaries',
        recommendation: 'Implement cross-account access reviews and monitoring',
        resourceType: 'USER',
        resourceName: user.user.UserName,
        details: { 
          totalAccounts: user.accountAccess?.length || 0,
          accessibleAccounts: user.accountAccess?.filter(a => a.hasAccess).length || 0
        },
        createdAt: new Date()
      });
    }

    // Determine overall risk level
    const riskLevel = this.determineRiskLevel(overallRiskScore);

    return {
      userId: user.user.UserId,
      userName: user.user.UserName,
      displayName: user.user.DisplayName,
      overallRiskScore,
      riskLevel,
      findings,
      accountAccess: accountRiskSummaries,
      totalPermissionSets: user.accountAccess?.reduce((sum, acc) => 
        sum + (acc.permissionSets?.length || 0), 0) || 0,
      adminAccess,
      crossAccountAccess,
      unusedPermissions: 0, // TODO: Implement unused permission detection
      lastAnalyzed: new Date()
    };
  }

  /**
   * Analyze risk for a specific permission set
   */
  async analyzePermissionSetRisk(
    permissionSet: any,
    accountId: string
  ): Promise<PermissionSetRisk> {
    const findings: RiskFinding[] = [];
    const policyAnalysis: PolicyAnalysisResult[] = [];
    let adminPermissions = false;
    let wildcardActions = 0;
    const sensitiveServices = new Set<string>();

    // Analyze AWS managed policies
    if (permissionSet.managedPolicies) {
      for (const policyArn of permissionSet.managedPolicies) {
        const analysis = await this.analyzeManagedPolicy(policyArn);
        policyAnalysis.push(analysis);
        
        if (analysis.adminPermissions) {
          adminPermissions = true;
        }
        
        wildcardActions += analysis.wildcardActionsCount;
        
        // Check for high-privilege policies
        if (HIGH_PRIVILEGE_POLICIES.includes(policyArn)) {
          findings.push({
            id: this.generateFindingId(),
            title: 'High-Privilege AWS Managed Policy',
            description: `Permission set uses high-privilege policy: ${policyArn}`,
            riskLevel: policyArn.includes('AdministratorAccess') ? 'CRITICAL' : 'HIGH' as RiskLevel,
            category: 'OVERLY_PERMISSIVE' as RiskCategory,
            severity: policyArn.includes('AdministratorAccess') ? 9 : 7,
            impact: 'Grants broad permissions that may exceed necessary access',
            recommendation: 'Review policy necessity and consider custom policies with minimal required permissions',
            resourceType: 'PERMISSION_SET',
            resourceArn: permissionSet.arn,
            resourceName: permissionSet.name,
            details: { policyArn, accountId },
            createdAt: new Date()
          });
        }

        findings.push(...analysis.findings);
      }
    }

    // Analyze inline policies
    if (permissionSet.inlinePolicyDocument) {
      const analysis = await this.analyzeInlinePolicy(permissionSet.inlinePolicyDocument, permissionSet.name);
      policyAnalysis.push(analysis);
      
      if (analysis.adminPermissions) {
        adminPermissions = true;
      }
      
      wildcardActions += analysis.wildcardActionsCount;
      findings.push(...analysis.findings);
    }

    // Collect sensitive services
    for (const analysis of policyAnalysis) {
      Object.keys(analysis.servicePermissions).forEach(service => {
        if (SENSITIVE_SERVICES.includes(service)) {
          sensitiveServices.add(service);
        }
      });
    }

    // Calculate permission set risk score
    const riskScore = this.calculatePermissionSetRiskScore({
      adminPermissions,
      wildcardActions,
      sensitiveServicesCount: sensitiveServices.size,
      findingsCount: findings.length,
      highSeverityFindings: findings.filter(f => f.severity >= 7).length
    });

    return {
      arn: permissionSet.arn,
      name: permissionSet.name,
      riskScore,
      riskLevel: this.determineRiskLevel(riskScore),
      findings,
      policyAnalysis,
      adminPermissions,
      wildcardActions,
      sensitiveServices: Array.from(sensitiveServices)
    };
  }

  /**
   * Analyze an AWS managed policy for risks
   */
  private async analyzeManagedPolicy(policyArn: string): Promise<PolicyAnalysisResult> {
    const findings: RiskFinding[] = [];
    let adminPermissions = false;
    let wildcardActionsCount = 0;
    let crossAccountAccess = false;

    // Extract policy name from ARN
    const policyName = policyArn.split('/').pop() || policyArn;

    // Check for administrative policies
    if (policyArn.includes('AdministratorAccess')) {
      adminPermissions = true;
      wildcardActionsCount = 1; // Wildcard for all actions
      
      findings.push({
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
      });
    }

    // Check for power user access
    if (policyArn.includes('PowerUserAccess')) {
      findings.push({
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
      });
    }

    // Since we don't have the actual policy document for managed policies,
    // we'll use known patterns and policy names to assess risk
    const servicePermissions = this.extractServiceFromPolicyName(policyName);

    return {
      policyArn,
      policyName,
      policyDocument: null, // We don't fetch managed policy documents
      findings,
      permissionsCount: 0, // Unknown for managed policies
      wildcardActionsCount,
      adminPermissions,
      crossAccountAccess,
      dataAccessPermissions: [],
      servicePermissions
    };
  }

  /**
   * Analyze an inline policy document for risks
   */
  private async analyzeInlinePolicy(policyDocument: string, policyName: string): Promise<PolicyAnalysisResult> {
    const findings: RiskFinding[] = [];
    let adminPermissions = false;
    let wildcardActionsCount = 0;
    let crossAccountAccess = false;
    const dataAccessPermissions: string[] = [];
    const servicePermissions: Record<string, string[]> = {};

    let policy: any;
    const parseResult = await Promise.resolve(policyDocument)
      .then(doc => JSON.parse(doc))
      .then(parsed => ({ success: true, data: parsed }))
      .catch(error => ({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }));

    if (!parseResult.success) {
      findings.push({
        id: this.generateFindingId(),
        title: 'Invalid Policy Document',
        description: 'Policy document contains invalid JSON',
        riskLevel: 'HIGH' as RiskLevel,
        category: 'SECURITY_MISCONFIGURATION' as RiskCategory,
        severity: 8,
        impact: 'Policy may not function as expected',
        recommendation: 'Fix JSON syntax errors in policy document',
        resourceType: 'POLICY',
        resourceName: policyName,
        details: { error: 'error' in parseResult ? parseResult.error : 'Unknown error' },
        createdAt: new Date()
      });
      
      return {
        policyName,
        policyDocument: null,
        findings,
        permissionsCount: 0,
        wildcardActionsCount: 0,
        adminPermissions: false,
        crossAccountAccess: false,
        dataAccessPermissions: [],
        servicePermissions: {}
      };
    }

    policy = 'data' in parseResult ? parseResult.data : null;

    const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
    let totalPermissions = 0;

    for (const statement of statements) {
      if (statement.Effect !== 'Allow') continue;

      const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
      const resources = Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource];

      totalPermissions += actions.length;

      // Check for wildcard actions
      const wildcardActions = actions.filter((action: string) => action === '*' || action.endsWith(':*'));
      wildcardActionsCount += wildcardActions.length;

      // Check for admin permissions
      if (actions.includes('*')) {
        adminPermissions = true;
        findings.push({
          id: this.generateFindingId(),
          title: 'Wildcard All Actions Permission',
          description: 'Policy grants access to all actions (*)',
          riskLevel: 'CRITICAL' as RiskLevel,
          category: 'OVERLY_PERMISSIVE' as RiskCategory,
          severity: 10,
          impact: 'Unrestricted access to all AWS services and actions',
          recommendation: 'Replace wildcard with specific required actions',
          resourceType: 'POLICY',
          resourceName: policyName,
          details: { statement },
          createdAt: new Date()
        });
      }

      // Check for cross-account access
      if (statement.Principal && typeof statement.Principal === 'object') {
        crossAccountAccess = true;
        findings.push({
          id: this.generateFindingId(),
          title: 'Cross-Account Access Grant',
          description: 'Policy allows access from external accounts',
          riskLevel: 'HIGH' as RiskLevel,
          category: 'CROSS_ACCOUNT_ACCESS' as RiskCategory,
          severity: 7,
          impact: 'Resources may be accessible from other AWS accounts',
          recommendation: 'Verify and restrict cross-account access to trusted accounts only',
          resourceType: 'POLICY',
          resourceName: policyName,
          details: { principal: statement.Principal },
          createdAt: new Date()
        });
      }

      // Analyze specific actions
      for (const action of actions) {
        // Check for sensitive actions
        if (SENSITIVE_ACTIONS.ESCALATION_ACTIONS.includes(action)) {
          findings.push({
            id: this.generateFindingId(),
            title: 'Privilege Escalation Risk',
            description: `Policy allows privilege escalation action: ${action}`,
            riskLevel: 'HIGH' as RiskLevel,
            category: 'PRIVILEGE_ESCALATION' as RiskCategory,
            severity: 8,
            impact: 'User may be able to escalate their privileges',
            recommendation: 'Carefully review privilege escalation permissions and add conditions where possible',
            resourceType: 'POLICY',
            resourceName: policyName,
            details: { action, statement },
            createdAt: new Date()
          });
        }

        if (SENSITIVE_ACTIONS.DATA_ACTIONS.includes(action)) {
          dataAccessPermissions.push(action);
        }

        if (SENSITIVE_ACTIONS.DESTRUCTIVE_ACTIONS.includes(action)) {
          findings.push({
            id: this.generateFindingId(),
            title: 'Destructive Action Permission',
            description: `Policy allows potentially destructive action: ${action}`,
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

      // Check for overly broad resource access
      if (resources.includes('*')) {
        findings.push({
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
        });
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

  /**
   * Extract likely services from AWS managed policy name
   */
  private extractServiceFromPolicyName(policyName: string): Record<string, string[]> {
    const servicePermissions: Record<string, string[]> = {};
    const nameLower = policyName.toLowerCase();

    // Map common policy patterns to services
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

  /**
   * Calculate risk score for a permission set
   */
  private calculatePermissionSetRiskScore(params: {
    adminPermissions: boolean;
    wildcardActions: number;
    sensitiveServicesCount: number;
    findingsCount: number;
    highSeverityFindings: number;
  }): number {
    let score = 1; // Base score

    // Admin permissions add significant risk
    if (params.adminPermissions) {
      score += 6;
    }

    // Wildcard actions
    score += Math.min(params.wildcardActions * 1.5, 3);

    // Sensitive services
    score += Math.min(params.sensitiveServicesCount * 0.5, 2);

    // Total findings
    score += Math.min(params.findingsCount * 0.3, 2);

    // High severity findings
    score += Math.min(params.highSeverityFindings * 0.8, 3);

    return Math.min(Math.round(score), 10);
  }

  /**
   * Calculate risk score for an account
   */
  private calculateAccountRiskScore(
    permissionSetRisks: PermissionSetRisk[],
    accountFindings: RiskFinding[]
  ): number {
    if (permissionSetRisks.length === 0) return 1;

    const maxPermissionSetRisk = Math.max(...permissionSetRisks.map(ps => ps.riskScore));
    const avgPermissionSetRisk = permissionSetRisks.reduce((sum, ps) => sum + ps.riskScore, 0) / permissionSetRisks.length;
    const accountFindingsScore = Math.min(accountFindings.length * 0.5, 2);

    return Math.min(Math.round(maxPermissionSetRisk * 0.7 + avgPermissionSetRisk * 0.2 + accountFindingsScore), 10);
  }

  /**
   * Determine risk level from numeric score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 9) return 'CRITICAL';
    if (score >= 7) return 'HIGH';
    if (score >= 5) return 'MEDIUM';
    if (score >= 3) return 'LOW';
    return 'INFO';
  }
}

// Export singleton instance
export const riskAnalyzer = new IAMRiskAnalyzer();
