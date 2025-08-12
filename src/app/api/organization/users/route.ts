import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { OrganizationUsersResponse } from '@/types/aws';

export async function GET(request: Request): Promise<NextResponse<OrganizationUsersResponse>> {
  const { searchParams } = new URL(request.url);
  const ssoRegion = searchParams.get('ssoRegion') || undefined;
  const region = searchParams.get('region') || 'us-east-1';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  
  const awsService = new AWSService(region);
  
  // Test connection first
  const connectionResult = await awsService.testConnection().then(
    result => ({ success: true, connected: result }),
    () => ({ success: false, connected: false })
  );
  
  if (!connectionResult.connected) {
    return NextResponse.json({
      success: false,
      error: 'AWS credentials not configured or invalid'
    }, { status: 401 });
  }

  // Get organization users
  const organizationUsers = await awsService.getOrganizationUsers(ssoRegion).then(
    users => users,
    error => {
      console.error('Error in organization users API:', error);
      return null;
    }
  );

  if (organizationUsers === null) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch organization users'
    }, { status: 500 });
  }

  // Apply search filter if provided
  let filteredUsers = organizationUsers;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredUsers = organizationUsers.filter(user => 
      user.user.UserName.toLowerCase().includes(searchLower) ||
      (user.user.DisplayName && user.user.DisplayName.toLowerCase().includes(searchLower)) ||
      user.user.Emails.some(email => email.Value.toLowerCase().includes(searchLower))
    );
  }

  // Calculate pagination
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / limit);
  const offset = (page - 1) * limit;
  const paginatedUsers = filteredUsers.slice(offset, offset + limit);

  return NextResponse.json({
    success: true,
    data: paginatedUsers,
    pagination: {
      currentPage: page,
      totalPages,
      totalUsers,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  });
}
