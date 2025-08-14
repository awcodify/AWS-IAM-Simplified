import type {
  RiskFinding,
  RiskLevel,
  RiskCategory,
  PolicyAnalysisResult,
  UserRiskProfile,
  PermissionSetRisk
} from '@/types/risk-analysis';
import {
  SENSITIVE_SERVICES
} from '@/types/risk-analysis';
import type { OrganizationUser, PermissionSetDetails, CrossAccountUserAccess } from '@/types/aws';
import { PolicyAnalyzer } from './policy-analyzer';
import { RiskCalculator } from './risk-calculator';

/**
 * Simplified IAM Risk Analyzer - main orchestrator
 */
export class IAMRiskAnalyzer {
  private policyAnalyzer = new PolicyAnalyzer();
  private riskCalculator = new RiskCalculator();

  private generateFindingId(): string {
    return `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Analyze a user's overall risk profile
   */
  async analyzeUserRisk(
    user: OrganizationUser
  ): Promise<UserRiskProfile> {
    const findings: RiskFinding[] = [];
    let overallRiskScore = 0;
    let adminAccess = false;
    let crossAccountAccess = false;

    const accountRiskSummaries = [];
    
    // Analyze each account the user has access to
    for (const accountAccess of user.accountAccess || []) {
      if (!accountAccess.hasAccess) continue;

      const accountRisk = await this.analyzeAccountAccess(user, accountAccess);
      accountRiskSummaries.push(accountRisk);
      
      if (accountRisk.adminAccess) adminAccess = true;
      if (accountAccess.accountId !== user.homeAccountId) crossAccountAccess = true;
      
      overallRiskScore = Math.max(overallRiskScore, accountRisk.riskScore);
      findings.push(...accountRisk.findings);
    }

    // Add user-level findings
    if (adminAccess) {
      findings.push(this.createAdminAccessFinding(user));
    }

    if (crossAccountAccess) {
      findings.push(this.createCrossAccountAccessFinding(user));
    }

    return {
      userId: user.user.UserId,
      userName: user.user.UserName,
      displayName: user.user.DisplayName,
      overallRiskScore,
      riskLevel: this.riskCalculator.determineRiskLevel(overallRiskScore),
      findings,
      accountAccess: accountRiskSummaries,
      totalPermissionSets: user.accountAccess?.reduce((sum, acc) => 
        sum + (acc.permissionSets?.length || 0), 0) || 0,
      adminAccess,
      crossAccountAccess,
      unusedPermissions: 0,
      lastAnalyzed: new Date()
    };
  }

  /**
   * Analyze risk for a specific permission set
   */
  async analyzePermissionSetRisk(
    permissionSet: PermissionSetDetails
  ): Promise<PermissionSetRisk> {
    const findings: RiskFinding[] = [];
    const policyAnalysis: PolicyAnalysisResult[] = [];
    const sensitiveServices = new Set<string>();
    
    let adminPermissions = false;
    let wildcardActions = 0;

    // Analyze managed policies
    for (const policyArn of permissionSet.managedPolicies || []) {
      const analysis = await this.policyAnalyzer.analyzeManagedPolicy(policyArn);
      policyAnalysis.push(analysis);
      
      if (analysis.adminPermissions) adminPermissions = true;
      wildcardActions += analysis.wildcardActionsCount;
      findings.push(...analysis.findings);
      
      this.collectSensitiveServices(analysis.servicePermissions, sensitiveServices);
    }

    // Analyze inline policies
    if (permissionSet.inlinePolicyDocument) {
      const analysis = await this.policyAnalyzer.analyzeInlinePolicy(
        permissionSet.inlinePolicyDocument, 
        permissionSet.name
      );
      policyAnalysis.push(analysis);
      
      if (analysis.adminPermissions) adminPermissions = true;
      wildcardActions += analysis.wildcardActionsCount;
      findings.push(...analysis.findings);
      
      this.collectSensitiveServices(analysis.servicePermissions, sensitiveServices);
    }

    const riskScore = this.riskCalculator.calculatePermissionSetRiskScore({
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
      riskLevel: this.riskCalculator.determineRiskLevel(riskScore),
      findings,
      policyAnalysis,
      adminPermissions,
      wildcardActions,
      sensitiveServices: Array.from(sensitiveServices)
    };
  }

  /**
   * Analyze permission set directly (simplified version)
   */
  async analyzePermissionSetDirectly(
    permissionSet: PermissionSetDetails
  ): Promise<UserRiskProfile> {
    const permissionSetRisk = await this.analyzePermissionSetRisk(permissionSet);
    
    return {
      userId: 'direct-analysis',
      userName: 'Permission Set Analysis',
      displayName: permissionSet.name,
      overallRiskScore: permissionSetRisk.riskScore,
      riskLevel: permissionSetRisk.riskLevel,
      findings: permissionSetRisk.findings,
      accountAccess: [],
      totalPermissionSets: 1,
      adminAccess: permissionSetRisk.adminPermissions,
      crossAccountAccess: false,
      unusedPermissions: 0,
      lastAnalyzed: new Date()
    };
  }

  // Helper methods
  private async analyzeAccountAccess(user: OrganizationUser, accountAccess: CrossAccountUserAccess) {
    const findings: RiskFinding[] = [];
    const permissionSetRisks: PermissionSetRisk[] = [];

    if (accountAccess.accountId !== user.homeAccountId) {
      findings.push({
        id: this.generateFindingId(),
        title: 'Cross-Account Access',
        description: `User has access to external account ${accountAccess.accountId}`,
        riskLevel: 'MEDIUM' as RiskLevel,
        category: 'CROSS_ACCOUNT_ACCESS' as RiskCategory,
        severity: 5,
        impact: 'Potential lateral movement across account boundaries',
        recommendation: 'Review and monitor cross-account access',
        resourceType: 'ACCOUNT',
        resourceName: accountAccess.accountName || accountAccess.accountId,
        details: { accountId: accountAccess.accountId },
        createdAt: new Date()
      });
    }

    // Analyze permission sets for this account
    for (const permissionSet of accountAccess.permissionSets || []) {
      let permissionSetDetails: PermissionSetDetails;
      
      // Handle both string ARNs and PermissionSetDetails objects
      if (typeof permissionSet === 'string') {
        // Create mock permission set from ARN
        const arn = permissionSet as string;
        permissionSetDetails = {
          arn,
          name: arn.split('/').pop() || arn,
          managedPolicies: [],
          inlinePolicyDocument: undefined
        };
      } else {
        permissionSetDetails = permissionSet as PermissionSetDetails;
      }
      
      const permissionSetRisk = await this.analyzePermissionSetRisk(permissionSetDetails);
      permissionSetRisks.push(permissionSetRisk);
    }

    const riskScore = this.riskCalculator.calculateAccountRiskScore(permissionSetRisks, findings);

    return {
      accountId: accountAccess.accountId,
      accountName: accountAccess.accountName || accountAccess.accountId,
      riskScore,
      riskLevel: this.riskCalculator.determineRiskLevel(riskScore),
      findings,
      permissionSets: permissionSetRisks,
      adminAccess: permissionSetRisks.some(ps => ps.adminPermissions)
    };
  }

  private collectSensitiveServices(servicePermissions: Record<string, string[]>, sensitiveServices: Set<string>): void {
    Object.keys(servicePermissions).forEach(service => {
      if (SENSITIVE_SERVICES.includes(service)) {
        sensitiveServices.add(service);
      }
    });
  }

  private createAdminAccessFinding(user: OrganizationUser): RiskFinding {
    return {
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
    };
  }

  private createCrossAccountAccessFinding(user: OrganizationUser): RiskFinding {
    return {
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
    };
  }
}

// Export singleton instance
export const riskAnalyzer = new IAMRiskAnalyzer();
