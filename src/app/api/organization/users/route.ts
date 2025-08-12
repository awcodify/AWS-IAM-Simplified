import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { OrganizationUsersResponse } from '@/types/aws';

export async function GET(request: Request): Promise<NextResponse<OrganizationUsersResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const ssoRegion = searchParams.get('ssoRegion') || undefined;
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

    const organizationUsers = await awsService.getOrganizationUsers(ssoRegion);
    
    return NextResponse.json({
      success: true,
      data: organizationUsers
    });
  } catch (error) {
    console.error('Error in organization users API:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('AccessDenied')) {
        return NextResponse.json({
          success: false,
          error: 'Access denied. You may not have permissions to access IAM Identity Center or SSO Admin service.'
        }, { status: 403 });
      }
      
      if (error.message.includes('UnauthorizedOperation')) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized operation. Please check your AWS permissions for IAM Identity Center.'
        }, { status: 403 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch organization users: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
