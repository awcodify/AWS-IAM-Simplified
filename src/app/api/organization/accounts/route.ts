import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { OrganizationAccountsResponse } from '@/types/aws';

export async function GET(request: Request): Promise<NextResponse<OrganizationAccountsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'us-east-1';
    
    const awsService = new AWSService(region);
    
    // Test connection first
    const isConnected = await awsService.testConnection();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'AWS credentials not configured or invalid'
      }, { status: 401 });
    }

    const accounts = await awsService.listOrganizationAccounts();
    
    if (accounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No organization accounts found. Make sure you are using a management account with AWS Organizations enabled.'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error in organization accounts API:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('AccessDenied')) {
        return NextResponse.json({
          success: false,
          error: 'Access denied. You may not have permissions to access AWS Organizations.'
        }, { status: 403 });
      }
      
      if (error.message.includes('UnauthorizedOperation')) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized operation. Please check your AWS permissions for Organizations.'
        }, { status: 403 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch organization accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
