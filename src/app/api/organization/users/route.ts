import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { OrganizationUsersResponse } from '@/types/aws';

export async function GET(request: Request): Promise<NextResponse<OrganizationUsersResponse>> {
  const { searchParams } = new URL(request.url);
  const ssoRegion = searchParams.get('ssoRegion') || undefined;
  const region = searchParams.get('region') || 'us-east-1';
  
  const awsService = new AWSService(region);
  
  // Test connection first
  const isConnected = await awsService.testConnection().then(result => result).catch(() => false);
  if (!isConnected) {
    return NextResponse.json({
      success: false,
      error: 'AWS credentials not configured or invalid'
    }, { status: 401 });
  }

  // Get organization users
  const organizationUsers = await awsService.getOrganizationUsers(ssoRegion).catch(error => {
    console.error('Error in organization users API:', error);
    return null; // Return null on error instead of throwing
  });

  if (organizationUsers === null) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch organization users'
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: organizationUsers
  });
}
