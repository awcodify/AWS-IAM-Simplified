import { NextResponse } from 'next/server';
import { SimplifiedAWSService } from '@/lib/aws-services';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';
import type { CrossAccountUserAccess } from '@/types/aws';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
  
  if (!requestData) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const { userIds, ssoRegion, region } = requestData;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'userIds array is required' },
      { status: 400 }
    );
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
  const userAccessResult = await awsService.getBulkUserAccountAccess(userIds, ssoRegion);
  
  if (!userAccessResult) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user access data' },
      { status: 500 }
    );
  }

  // Convert Map to object for JSON serialization
  const result: Record<string, CrossAccountUserAccess[]> = {};
  userAccessResult.forEach((access, userId) => {
    result[userId] = access;
  });

  return NextResponse.json({
    success: true,
    data: result
  });
  } catch (error) {
    console.error('Error in bulk user access:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
