import { NextResponse } from 'next/server';
import { SimplifiedAWSService } from '@/lib/aws-services';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';
import type { CrossAccountUserAccess } from '@/types/aws';

interface UserAccountAccessResponse {
  success: boolean;
  data?: CrossAccountUserAccess[];
  error?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<UserAccountAccessResponse>> {
  const { searchParams } = new URL(request.url);
  const ssoRegion = searchParams.get('ssoRegion') || undefined;
  const region = searchParams.get('region') || 'us-east-1';
  const resolvedParams = await params;
  const userId = resolvedParams.userId;

  if (!userId) {
    return NextResponse.json({
      success: false,
      error: 'User ID is required'
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

  const awsService = new SimplifiedAWSService(region, credentials);
  
  // Test connection first
  const connectionResult = await awsService.testConnection().then(
    isConnected => ({ success: true as const, isConnected }),
    error => ({ success: false as const, error })
  );

  if (!connectionResult.success) {
    return NextResponse.json({
      success: false,
      error: 'AWS credentials not configured or invalid'
    }, { status: 401 });
  }

  if (!connectionResult.isConnected) {
    return NextResponse.json({
      success: false,
      error: 'AWS credentials not configured or invalid'
    }, { status: 401 });
  }

  const accountAccessResult = await awsService.getUserAccountAccess(decodeURIComponent(userId), ssoRegion).then(
    data => ({ success: true as const, data }),
    error => ({ success: false as const, error })
  );

  if (!accountAccessResult.success) {
    console.error('Error in user account access API:', accountAccessResult.error);
    return NextResponse.json({
      success: false,
      error: `Failed to fetch user account access: ${accountAccessResult.error instanceof Error ? accountAccessResult.error.message : 'Unknown error'}`
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: accountAccessResult.data
  });
}
