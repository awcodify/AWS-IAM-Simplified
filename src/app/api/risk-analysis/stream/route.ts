import { NextRequest } from 'next/server';
import { riskAnalyzer } from '@/lib/risk-analyzer';
import { SimplifiedAWSService, SSOService } from '@/lib/aws-services';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';
import type { UserRiskProfile } from '@/types/risk-analysis';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(error => {
    console.error('Failed to parse request body:', error);
    return null;
  });

  if (!body) {
    return new Response('Invalid request body', { status: 400 });
  }

  const { permissionSets, region, ssoRegion } = body;

  if (!permissionSets || !Array.isArray(permissionSets)) {
    return new Response('Permission sets array is required', { status: 400 });
  }

  // Extract credentials from headers
  const credentials = extractCredentialsFromHeaders(request);
  if (!credentials) {
    return new Response('AWS credentials not provided', { status: 401 });
  }

  console.log(`Starting streaming risk analysis for ${permissionSets.length} permission sets...`);

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (type: string, data: unknown) => {
        const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        console.log(`Sending ${type} event:`, data);
        controller.enqueue(encoder.encode(message));
      };

      // Send initial status
      sendEvent('start', {
        totalPermissionSets: permissionSets.length,
        message: 'Initializing risk analysis...'
      });

      // Initialize AWS service
      const awsService = new SimplifiedAWSService(ssoRegion || region, credentials);
      let instanceArn = '';

      // Get SSO instance
      const ssoInstances = await awsService.getSSOInstances(ssoRegion || region).catch(() => {
        console.warn('Could not get SSO instance');
        return [];
      });

      if (ssoInstances.length > 0) {
        instanceArn = ssoInstances[0].InstanceArn;
        sendEvent('progress', {
          message: `Using SSO instance: ${instanceArn}`,
          currentStep: 'initialization'
        });
      }

      const results: UserRiskProfile[] = [];
      let completedCount = 0;

      // Process each permission set individually
      for (let i = 0; i < permissionSets.length; i++) {
        const permissionSet = permissionSets[i];
        
        sendEvent('progress', {
          currentIndex: i,
          totalCount: permissionSets.length,
          permissionSetName: permissionSet.name,
          message: `Analyzing ${permissionSet.name || 'Unknown'}...`,
          currentStep: 'analyzing',
          progress: Math.round(((i) / permissionSets.length) * 100)
        });

        const ssoService = new SSOService(ssoRegion || region, credentials);
        const enrichedPermissionSet = await ssoService.getPermissionSetDetails(
          instanceArn,
          permissionSet.arn
        ).catch(() => {
          console.warn(`Failed to get details for ${permissionSet.name}`);
          return permissionSet;
        });

        const finalPermissionSet = enrichedPermissionSet || permissionSet;

        // Perform risk analysis
        const riskProfile = await riskAnalyzer.analyzePermissionSetRisk(finalPermissionSet, 'organization')
          .catch(error => {
            console.error(`Error analyzing ${permissionSet.name}:`, error);
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

        // Convert to UserRiskProfile format
        const userRiskProfile: UserRiskProfile = {
          userId: permissionSet.arn || permissionSet.name,
          userName: permissionSet.name,
          displayName: permissionSet.description || permissionSet.name,
          overallRiskScore: riskProfile.riskScore,
          riskLevel: riskProfile.riskLevel,
          findings: riskProfile.findings,
          accountAccess: [],
          totalPermissionSets: 1,
          adminAccess: riskProfile.adminPermissions,
          crossAccountAccess: riskProfile.findings.some(f => f.category === 'CROSS_ACCOUNT_ACCESS'),
          unusedPermissions: 0,
          lastAnalyzed: new Date()
        };

        results.push(userRiskProfile);
        completedCount++;

        // Calculate progress consistently
        const progressPercentage = Math.round((completedCount / permissionSets.length) * 100);

        // Send result with progress update immediately
        sendEvent('result', {
          permissionSet: userRiskProfile,
          index: i,
          completedCount,
          totalCount: permissionSets.length,
          progress: progressPercentage,
          message: `Completed ${completedCount}/${permissionSets.length}: ${permissionSet.name}`,
          currentStep: 'analyzing'
        });

        console.log(`Completed ${completedCount}/${permissionSets.length}: ${permissionSet.name} - ${riskProfile.riskLevel} (${progressPercentage}%)`);
      }

      // Send final summary
      const summary = {
        totalUsers: results.length,
        criticalUsers: results.filter(p => p.riskLevel === 'CRITICAL').length,
        highRiskUsers: results.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH').length,
        adminUsers: results.filter(p => p.adminAccess).length,
        crossAccountUsers: results.filter(p => p.crossAccountAccess).length,
        averageRiskScore: results.length > 0 
          ? Math.round((results.reduce((sum, p) => sum + p.overallRiskScore, 0) / results.length) * 10) / 10
          : 0
      };

      sendEvent('complete', {
        summary,
        allResults: results,
        message: 'Risk analysis complete!'
      });

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
