import { NextResponse } from 'next/server';
import { UserService } from '@/lib/aws-services/user-service';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';

/**
 * GET /api/iam/users/[userName]/permissions
 * Get IAM user permissions (policies and groups)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userName: string }> }
) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'us-east-1';
  const resolvedParams = await params;
  const userName = decodeURIComponent(resolvedParams.userName);

  // Extract credentials from headers
  const credentials = extractCredentialsFromHeaders(request);
  if (!credentials) {
    return NextResponse.json({
      error: 'AWS credentials not provided'
    }, { status: 401 });
  }

  // Get user permissions
  const userService = new UserService(region, credentials);
  const permissions = await userService.getIAMUserPermissions(userName);

  if (!permissions) {
    return NextResponse.json({
      error: 'Failed to fetch user permissions'
    }, { status: 500 });
  }

  return NextResponse.json({
    permissions,
    timestamp: new Date().toISOString()
  });
}
