import { NextRequest, NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { CrossAccountUserAccess } from '@/types/aws';

export async function POST(request: NextRequest) {
  try {
    const { userIds, ssoRegion, region } = await request.json();
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds array is required' },
        { status: 400 }
      );
    }

    const awsService = new AWSService(region);
    const userAccessMap = await awsService.getBulkUserAccountAccess(userIds, ssoRegion);
    
    // Convert Map to object for JSON serialization
    const result: Record<string, CrossAccountUserAccess[]> = {};
    userAccessMap.forEach((access, userId) => {
      result[userId] = access;
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in bulk user access API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
