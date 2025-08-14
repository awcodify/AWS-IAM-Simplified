import type { RiskLevel, PermissionSetRisk, RiskFinding } from '@/types/risk-analysis';

/**
 * Simple risk calculator for scoring and determining risk levels
 */
export class RiskCalculator {
  
  /**
   * Calculate risk score for a permission set based on key factors
   */
  calculatePermissionSetRiskScore(params: {
    adminPermissions: boolean;
    wildcardActions: number;
    sensitiveServicesCount: number;
    findingsCount: number;
    highSeverityFindings: number;
  }): number {
    let score = 0;

    // Admin permissions are critical
    if (params.adminPermissions) {
      score += 8;
    }

    // Wildcard actions increase risk
    score += Math.min(params.wildcardActions * 2, 4);

    // Sensitive services add to risk
    score += Math.min(params.sensitiveServicesCount * 0.5, 2);

    // Multiple findings indicate broader risk
    score += Math.min(params.findingsCount * 0.3, 3);

    // High severity findings are particularly concerning
    score += Math.min(params.highSeverityFindings * 1.5, 4);

    return Math.min(Math.round(score), 10);
  }

  /**
   * Calculate risk score for an account based on permission sets
   */
  calculateAccountRiskScore(
    permissionSetRisks: PermissionSetRisk[],
    accountFindings: RiskFinding[]
  ): number {
    if (permissionSetRisks.length === 0) return 0;

    // Take the highest permission set risk as the base
    const maxPermissionSetRisk = Math.max(...permissionSetRisks.map(ps => ps.riskScore));
    
    // Add account-level findings impact
    const accountFindingsImpact = Math.min(accountFindings.length * 0.5, 2);
    
    return Math.min(maxPermissionSetRisk + accountFindingsImpact, 10);
  }

  /**
   * Determine risk level from numeric score
   */
  determineRiskLevel(score: number): RiskLevel {
    if (score >= 9) return 'CRITICAL';
    if (score >= 7) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    if (score >= 1) return 'LOW';
    return 'INFO';
  }

  /**
   * Get risk level color for UI display
   */
  getRiskLevelColor(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'CRITICAL': return 'text-red-900 bg-red-100';
      case 'HIGH': return 'text-red-700 bg-red-50';
      case 'MEDIUM': return 'text-yellow-700 bg-yellow-50';
      case 'LOW': return 'text-blue-700 bg-blue-50';
      case 'INFO': return 'text-gray-700 bg-gray-50';
    }
  }

  /**
   * Get simplified risk description
   */
  getRiskDescription(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'CRITICAL': return 'Immediate attention required';
      case 'HIGH': return 'Review recommended';
      case 'MEDIUM': return 'Monitor closely';
      case 'LOW': return 'Generally acceptable';
      case 'INFO': return 'Informational only';
    }
  }
}
