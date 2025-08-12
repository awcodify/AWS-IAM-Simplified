import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { OrganizationAccountsResponse } from '@/types/aws';

export async function GET(request: Request): Promise<NextResponse<OrganizationAccountsResponse>> {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'us-east-1';
  
  const awsService = new AWSService(region);
  
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

  const accountsResult = await awsService.listOrganizationAccounts().then(
    accounts => ({ success: true as const, accounts }),
    error => ({ success: false as const, error })
  );

  if (!accountsResult.success) {
    console.error('Error in organization accounts API:', accountsResult.error);
    
    // Check for specific error types
    if (accountsResult.error instanceof Error) {
      if (accountsResult.error.message.includes('AccessDenied')) {
        return NextResponse.json({
          success: false,
          error: 'Access denied. You may not have permissions to access AWS Organizations.'
        }, { status: 403 });
      }
      
      if (accountsResult.error.message.includes('UnauthorizedOperation')) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized operation. Please check your AWS permissions for Organizations.'
        }, { status: 403 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch organization accounts: ${accountsResult.error instanceof Error ? accountsResult.error.message : 'Unknown error'}`
    }, { status: 500 });
  }

  if (accountsResult.accounts.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No organization accounts found. Make sure you are using a management account with AWS Organizations enabled.'
    }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: accountsResult.accounts
  });
}
