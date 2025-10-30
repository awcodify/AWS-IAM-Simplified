import { NextRequest, NextResponse } from 'next/server';
import { SimplifiedAWSService } from '@/lib/aws-services';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';
import { safeAsync } from '@/lib/result';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const awsRegion = searchParams.get('region');
  const ssoRegion = searchParams.get('ssoRegion');

  if (!awsRegion || !ssoRegion) {
    return NextResponse.json({
      success: false,
      error: 'Missing required parameters: region and ssoRegion'
    }, { status: 400 });
  }

  // Extract credentials from headers
  const credentials = extractCredentialsFromHeaders(request);
  if (!credentials) {
    return NextResponse.json({
      success: false,
      error: 'AWS credentials not provided'
    }, { status: 401 });
  }

  const awsService = new SimplifiedAWSService(ssoRegion, credentials);
  
  // Get SSO instance
  const ssoInstancesResult = await safeAsync(awsService.getSSOInstances(ssoRegion));
  if (!ssoInstancesResult.success) {
    return NextResponse.json({
      success: false,
      error: 'IAM Identity Center not accessible. Please ensure it is enabled in your account and you have proper permissions.',
      details: ssoInstancesResult.error?.message || String(ssoInstancesResult.error)
    }, { status: 500 });
  }

  if (!ssoInstancesResult.data.length) {
    return NextResponse.json({
      success: false,
      error: 'No IAM Identity Center instances found. Please enable IAM Identity Center in your AWS account first.'
    }, { status: 404 });
  }

  const permissionSetsResult = await safeAsync(awsService.getPermissionSets());
  
  if (!permissionSetsResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch permission sets'
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: permissionSetsResult.data
  });
}
