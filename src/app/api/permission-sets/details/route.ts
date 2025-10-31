import { NextRequest, NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-services';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const permissionSetArn = searchParams.get('arn');
  const fallbackName = searchParams.get('name'); // Optional fallback name
  const ssoRegion = searchParams.get('ssoRegion');

  if (!permissionSetArn) {
    return NextResponse.json({
      success: false,
      error: 'Permission set ARN is required'
    }, { status: 400 });
  }

  if (!ssoRegion) {
    return NextResponse.json({
      success: false,
      error: 'SSO region is required'
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
  
  // Extract instance ARN from permission set ARN
  // Format: arn:aws:sso:::permissionSet/ssoins-1234567890123456/ps-1234567890123456
  console.log('Original permission set ARN:', permissionSetArn);
  const arnParts = permissionSetArn.split('/');
  console.log('ARN parts:', arnParts);
  
  if (arnParts.length < 2) {
    return NextResponse.json({
      success: false,
      error: 'Invalid permission set ARN format'
    }, { status: 400 });
  }
  
  const instanceId = arnParts[1];
  const instanceArn = `arn:aws:sso:::instance/${instanceId}`;
  console.log('Extracted instance ARN:', instanceArn);
  console.log('Using SSO region:', ssoRegion);

  const awsService = new AWSService(ssoRegion, credentials);

  // Try to get full permission set details
  console.log('Attempting to fetch permission set details:', {
    instanceArn,
    permissionSetArn,
    instanceId
  });
  
  const permissionSetDetails = await awsService.getPermissionSetDetails(permissionSetArn, ssoRegion);

  if (!permissionSetDetails) {
    // Create a fallback response with basic information
    const permissionSetId = arnParts[2] || 'unknown';
    const fallbackPermissionSet = {
      name: fallbackName || permissionSetId,
      arn: permissionSetArn,
      description: 'Detailed information not available - insufficient permissions to access SSO admin APIs',
      sessionDuration: undefined,
      managedPolicies: [],
      customerManagedPolicies: [],
      inlinePolicyDocument: undefined,
      hasLimitedInfo: true // Flag to indicate this is fallback data
    };

    return NextResponse.json({
      success: true,
      data: fallbackPermissionSet,
      warning: 'Limited information available due to insufficient permissions'
    });
  }

  return NextResponse.json({
    success: true,
    data: permissionSetDetails
  });
}
