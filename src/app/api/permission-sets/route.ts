import { NextRequest, NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
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

  const awsService = new AWSService(ssoRegion, credentials);
  
  // Get SSO instance
  const ssoInstancesResult = await safeAsync(awsService.getSSOInstances(ssoRegion));
  if (!ssoInstancesResult.success) {
    console.error('Error fetching SSO instances:', ssoInstancesResult.error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch SSO instances'
    }, { status: 500 });
  }

  if (!ssoInstancesResult.data.length) {
    return NextResponse.json({
      success: false,
      error: 'No SSO instances found'
    }, { status: 404 });
  }

  const ssoInstance = ssoInstancesResult.data[0];
  const permissionSetsResult = await safeAsync(awsService.getPermissionSets(ssoInstance.InstanceArn));
  
  if (!permissionSetsResult.success) {
    console.error('Error fetching permission sets:', permissionSetsResult.error);
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
