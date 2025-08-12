import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';
import type { CrossAccountUserAccess } from '@/types/aws';

interface UserAccountAccessResponse {
  success: boolean;
  data?: CrossAccountUserAccess[];
  error?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
): Promise<NextResponse<UserAccountAccessResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const ssoRegion = searchParams.get('ssoRegion') || undefined;
    const region = searchParams.get('region') || 'us-east-1';
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    const awsService = new AWSService(region);
    
    // Test connection first
    const isConnected = await awsService.testConnection();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'AWS credentials not configured or invalid'
      }, { status: 401 });
    }

    const accountAccess = await awsService.getUserAccountAccess(decodeURIComponent(userId), ssoRegion);
    
    return NextResponse.json({
      success: true,
      data: accountAccess
    });
  } catch (error) {
    console.error('Error in user account access API:', error);
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch user account access: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
