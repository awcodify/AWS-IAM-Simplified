import { NextResponse } from 'next/server';
import { UserService } from '@/lib/aws-services/user-service';
import { AccountService } from '@/lib/aws-services/account-service';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';

/**
 * GET /api/iam/users
 * List IAM users in the current account
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'us-east-1';

  // Extract credentials from headers
  const credentials = extractCredentialsFromHeaders(request);
  if (!credentials) {
    return NextResponse.json({
      error: 'AWS credentials not provided'
    }, { status: 401 });
  }

  // Test connection first
  const accountService = new AccountService(region, credentials);
  const accountInfoResult = await accountService.getAccountInfo();

  if (!accountInfoResult.success) {
    return NextResponse.json({
      error: 'Failed to get account information',
      details: accountInfoResult.error.message
    }, { status: 401 });
  }

  const accountId = accountInfoResult.data.accountId;

  // Get IAM users
  const userService = new UserService(region, credentials);
  const iamUsers = await userService.getIAMUsers();

  // Convert IAM users to organization user format
  const organizationUsers = iamUsers.map(user => 
    userService.createOrganizationUserFromIAM(user, accountId)
  );

  return NextResponse.json({
    users: organizationUsers,
    accountId,
    count: organizationUsers.length,
    timestamp: new Date().toISOString()
  });
}
