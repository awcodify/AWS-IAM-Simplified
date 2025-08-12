import { NextRequest, NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { CrossAccountUserAccess } from '@/types/aws';

export async function POST(request: NextRequest) {
  const requestData = await request.json().catch(() => null);
  
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

  const awsService = new AWSService(region);
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
}
