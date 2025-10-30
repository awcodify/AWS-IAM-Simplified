import { NextRequest, NextResponse } from 'next/server';
import { riskAnalyzer } from '@/lib/risk-analyzer';
import { SimplifiedAWSService } from '@/lib/aws-services';
import type { UserRiskProfile } from '@/types/risk-analysis';
import type { OrganizationUser, PermissionSetDetails } from '@/types/aws';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(error => {
    console.error('Failed to parse request body:', error);
    return null;
  });

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { users, permissionSets, region, ssoRegion, analysisType } = body;

  // Check if this is a permission set analysis
  if (analysisType === 'permission-sets') {
    if (!permissionSets || !Array.isArray(permissionSets)) {
      return NextResponse.json(
        { error: 'Permission sets array is required for permission set analysis' },
        { status: 400 }
      );
    }

    console.log(`Analyzing risk for ${permissionSets.length} permission sets...`);
    console.log(`Using region: ${region}, SSO region: ${ssoRegion}`);

    // Initialize AWS service for permission set details
    const awsService = new SimplifiedAWSService(ssoRegion || region);

    // Get detailed permission set information
    const enrichedPermissionSets = [];
    
    // First, get SSO instance to extract instance ARN
    let instanceArn = '';
    const ssoInstances = await awsService.getSSOInstances(ssoRegion || region).catch(() => {
      console.warn('Could not get SSO instance, using ARN extraction');
      return [];
    });
    
    if (ssoInstances.length > 0) {
      instanceArn = ssoInstances[0].InstanceArn;
      console.log(`Using SSO instance: ${instanceArn}`);
    } else {
      console.warn('No SSO instances found - risk analysis will use basic permission set data only');
    }

    for (const permissionSet of permissionSets) {
      // Extract instance ARN from permission set ARN if we don't have it
      let currentInstanceArn = instanceArn;
      if (!currentInstanceArn && permissionSet.arn) {
        const arnParts = permissionSet.arn.split('/');
        if (arnParts.length >= 2) {
          const instanceId = arnParts[1];
          currentInstanceArn = `arn:aws:sso:::instance/${instanceId}`;
        }
      }

      if (currentInstanceArn && permissionSet.arn) {
        console.log(`Getting details for permission set: ${permissionSet.name || permissionSet.arn}`);
        const permissionSetDetails = await awsService.getPermissionSetDetailsWithInstance(
          currentInstanceArn,
          permissionSet.arn,
          ssoRegion || region
        ).catch(() => {
          console.warn(`Failed to get details for permission set ${permissionSet.arn || permissionSet.name}`);
          return null;
        });
        
        if (permissionSetDetails) {
          enrichedPermissionSets.push({
            ...permissionSet,
            ...permissionSetDetails
          });
        } else {
          enrichedPermissionSets.push(permissionSet);
        }
      } else {
        console.warn(`Could not determine instance ARN for permission set ${permissionSet.arn || permissionSet.name}`);
        enrichedPermissionSets.push(permissionSet);
      }
    }

      console.log(`Successfully enriched ${enrichedPermissionSets.length} permission sets`);

      // Analyze risk for each permission set
      const permissionSetRiskProfiles: UserRiskProfile[] = [];
      
    for (const permissionSet of enrichedPermissionSets) {
      console.log(`Analyzing risk for permission set: ${permissionSet.name}`);

      // Analyze the permission set directly (use a generic account ID for standalone analysis)
      const riskProfile = await riskAnalyzer.analyzePermissionSetRisk(permissionSet, 'organization')
        .catch(error => {
          console.error(`Error analyzing risk for permission set ${permissionSet.name}:`, error);
          return {
            riskScore: 1,
            riskLevel: 'INFO' as const,
            findings: [{
              id: `error-${permissionSet.arn || permissionSet.name}`,
              title: 'Risk Analysis Failed',
              description: 'Unable to complete risk analysis for this permission set',
              riskLevel: 'INFO' as const,
              category: 'SECURITY_MISCONFIGURATION' as const,
              severity: 1,
              impact: 'Risk assessment incomplete',
              recommendation: 'Manually review permission set policies',
              resourceType: 'PERMISSION_SET' as const,
              resourceName: permissionSet.name,
              details: { error: error instanceof Error ? error.message : String(error) },
              createdAt: new Date()
            }],
            adminPermissions: false
          };
        });
      
      // Convert to UserRiskProfile format for compatibility with existing UI
      const userRiskProfile: UserRiskProfile = {
        userId: permissionSet.arn || permissionSet.name,
        userName: permissionSet.name,
        displayName: permissionSet.description || permissionSet.name,
        overallRiskScore: riskProfile.riskScore,
        riskLevel: riskProfile.riskLevel,
        findings: riskProfile.findings,
        accountAccess: [], // Not applicable for permission sets
        totalPermissionSets: 1,
        adminAccess: riskProfile.adminPermissions,
        crossAccountAccess: riskProfile.findings.some(f => f.category === 'CROSS_ACCOUNT_ACCESS'),
        unusedPermissions: 0, // Would need usage data to determine
        lastAnalyzed: new Date()
      };
      
      permissionSetRiskProfiles.push(userRiskProfile);
      
      console.log(`Risk analysis complete for ${permissionSet.name}: ${riskProfile.riskLevel} (${riskProfile.riskScore}/10)`);
    }

      // Calculate summary statistics
      const summary = {
        totalUsers: permissionSetRiskProfiles.length,
        criticalUsers: permissionSetRiskProfiles.filter(p => p.riskLevel === 'CRITICAL').length,
        highRiskUsers: permissionSetRiskProfiles.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH').length,
        adminUsers: permissionSetRiskProfiles.filter(p => p.adminAccess).length,
        crossAccountUsers: permissionSetRiskProfiles.filter(p => p.crossAccountAccess).length,
        averageRiskScore: permissionSetRiskProfiles.length > 0 
          ? permissionSetRiskProfiles.reduce((sum, p) => sum + p.overallRiskScore, 0) / permissionSetRiskProfiles.length 
          : 0,
        totalFindings: permissionSetRiskProfiles.reduce((sum, p) => sum + p.findings.length, 0)
      };

      console.log(`Permission set risk analysis complete. Found ${summary.totalFindings} findings across ${summary.totalUsers} permission sets.`);

      return NextResponse.json({
        permissionSetRiskProfiles,
        summary
      });
    }

    // Original user-based analysis (keep for backward compatibility)
    if (!users || !Array.isArray(users)) {
      return NextResponse.json(
        { error: 'Users array is required for user-based analysis' },
        { status: 400 }
      );
    }

    console.log(`Analyzing risk for ${users.length} users...`);
    console.log(`Using region: ${region}, SSO region: ${ssoRegion}`);

    // Initialize AWS service for permission set details (centralized from org account)
    const awsService = new SimplifiedAWSService(ssoRegion || region);

    // Check if we have any users with account access data
    const usersWithAccess = users.filter((user: OrganizationUser) => 
      user.accountAccess && user.accountAccess.length > 0
    );

    if (usersWithAccess.length === 0) {
      console.warn('No users have account access data loaded. Risk analysis requires user access data.');
      return NextResponse.json({
        error: 'No user access data available for risk analysis. Please ensure users have been loaded with their account access information. For environments without cross-account access, make sure to use SSO-only mode to avoid access errors.',
        userRiskProfiles: [],
        summary: {
          totalUsers: 0,
          criticalUsers: 0,
          highRiskUsers: 0,
          adminUsers: 0,
          crossAccountUsers: 0,
          averageRiskScore: 0,
          totalFindings: 0
        }
      }, { status: 400 });
    }

    console.log(`Found ${usersWithAccess.length} users with account access data to analyze`);

    // Get all unique permission sets from users (to avoid duplicate API calls)
    const uniquePermissionSets = new Map<string, PermissionSetDetails>();
    
    usersWithAccess.forEach((user: OrganizationUser) => {
      user.accountAccess?.forEach((accountAccess) => {
        if (accountAccess.hasAccess && accountAccess.permissionSets) {
          accountAccess.permissionSets.forEach((ps) => {
            if (!uniquePermissionSets.has(ps.arn)) {
              uniquePermissionSets.set(ps.arn, ps);
            }
          });
        }
      });
    });

    console.log(`Found ${uniquePermissionSets.size} unique permission sets to analyze`);

    // Get detailed permission set information once for all unique permission sets
    const enrichedPermissionSets = new Map<string, PermissionSetDetails>();
    
    // First, get SSO instance to extract instance ARN
    let instanceArn = '';
    const ssoInstances = await awsService.getSSOInstances(ssoRegion || region).catch(() => {
      console.warn('Could not get SSO instance, using ARN extraction');
      return [];
    });
    
    if (ssoInstances.length > 0) {
      instanceArn = ssoInstances[0].InstanceArn;
      console.log(`Using SSO instance: ${instanceArn}`);
    } else {
      console.warn('No SSO instances found - risk analysis will use basic permission set data only');
    }

    for (const [psArn, basicPermissionSet] of uniquePermissionSets) {
      // Extract instance ARN from permission set ARN if we don't have it
      let currentInstanceArn = instanceArn;
      if (!currentInstanceArn) {
        const arnParts = psArn.split('/');
        if (arnParts.length >= 2) {
          const instanceId = arnParts[1];
          currentInstanceArn = `arn:aws:sso:::instance/${instanceId}`;
        }
      }

      if (currentInstanceArn) {
        console.log(`Getting details for permission set: ${basicPermissionSet.name || psArn}`);
        const permissionSetDetails = await awsService.getPermissionSetDetailsWithInstance(
          currentInstanceArn,
          psArn,
          ssoRegion || region
        ).catch(() => {
          console.warn(`Failed to get details for permission set ${psArn}`);
          return null;
        });
        
        if (permissionSetDetails) {
          enrichedPermissionSets.set(psArn, {
            ...basicPermissionSet,
            ...permissionSetDetails
          });
        } else {
          enrichedPermissionSets.set(psArn, basicPermissionSet);
        }
      } else {
        console.warn(`Could not determine instance ARN for permission set ${psArn}`);
        enrichedPermissionSets.set(psArn, basicPermissionSet);
      }
    }

    console.log(`Successfully enriched ${enrichedPermissionSets.size} permission sets`);

    // Analyze risk for each user using the enriched permission set data
    const userRiskProfiles: UserRiskProfile[] = [];
    
    for (const user of usersWithAccess) {
      console.log(`Analyzing risk for user: ${user.user.UserName}`);

      // Use the pre-enriched permission sets data
      const enrichedUser = { ...user };
      
      for (const accountAccess of enrichedUser.accountAccess) {
        if (!accountAccess.hasAccess || !accountAccess.permissionSets) continue;
        
        // Replace permission sets with enriched versions
        accountAccess.permissionSets = accountAccess.permissionSets.map((ps: PermissionSetDetails) => 
          enrichedPermissionSets.get(ps.arn) || ps
        );
      }

      const riskProfile = await riskAnalyzer.analyzeUserRisk(enrichedUser)
        .catch(error => {
          console.error(`Error analyzing risk for user ${user.user.UserName}:`, error);
          return {
            userId: user.user.UserId,
            userName: user.user.UserName,
            displayName: user.user.DisplayName,
            overallRiskScore: 1,
            riskLevel: 'INFO' as const,
            findings: [{
              id: `error-${user.user.UserId}`,
              title: 'Risk Analysis Failed',
              description: 'Unable to complete risk analysis for this user',
              riskLevel: 'INFO' as const,
              category: 'SECURITY_MISCONFIGURATION' as const,
              severity: 1,
              impact: 'Risk assessment incomplete',
              recommendation: 'Manually review user permissions',
              resourceType: 'USER' as const,
              resourceName: user.user.UserName,
              details: { error: error instanceof Error ? error.message : String(error) },
              createdAt: new Date()
            }],
            accountAccess: [],
            totalPermissionSets: 0,
            adminAccess: false,
            crossAccountAccess: false,
            unusedPermissions: 0,
            lastAnalyzed: new Date()
          };
        });
      
      userRiskProfiles.push(riskProfile);
      
      console.log(`Risk analysis complete for ${user.user.UserName}: ${riskProfile.riskLevel} (${riskProfile.overallRiskScore}/10)`);
    }

    // Calculate summary statistics
    const summary = {
      totalUsers: userRiskProfiles.length,
      criticalUsers: userRiskProfiles.filter(p => p.riskLevel === 'CRITICAL').length,
      highRiskUsers: userRiskProfiles.filter(p => p.riskLevel === 'HIGH').length,
      adminUsers: userRiskProfiles.filter(p => p.adminAccess).length,
      crossAccountUsers: userRiskProfiles.filter(p => p.crossAccountAccess).length,
      averageRiskScore: userRiskProfiles.length > 0 
        ? userRiskProfiles.reduce((sum, p) => sum + p.overallRiskScore, 0) / userRiskProfiles.length
        : 0,
      totalFindings: userRiskProfiles.reduce((sum, p) => sum + p.findings.length, 0)
    };

    console.log('Risk analysis summary:', summary);

    return NextResponse.json({
      userRiskProfiles,
      summary,
      analyzedAt: new Date().toISOString()
    });
}

export async function GET() {
  // Return information about the risk analyzer capabilities
  return NextResponse.json({
    name: 'IAM Risk Analyzer',
    version: '1.0.0',
    description: 'Analyzes IAM permissions for security risks and compliance violations',
    capabilities: [
      'Permission set risk analysis',
      'Cross-account access detection',
      'Administrative privilege identification',
      'Policy overpermission detection',
      'Privilege escalation risk assessment',
      'Data exposure risk evaluation'
    ],
    riskCategories: [
      'OVERLY_PERMISSIVE',
      'PRIVILEGE_ESCALATION',
      'DATA_EXPOSURE',
      'SECURITY_MISCONFIGURATION',
      'COMPLIANCE_VIOLATION',
      'UNUSED_PERMISSIONS',
      'ADMINISTRATIVE_ACCESS',
      'CROSS_ACCOUNT_ACCESS',
      'SERVICE_SPECIFIC'
    ],
    riskLevels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
  });
}
