import { NextRequest, NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  
  if (!username) {
    return NextResponse.json({
      success: false,
      error: 'Username is required'
    }, { status: 400 });
  }

  const awsService = new AWSService();
  const userPermissions = await awsService.getUserPermissions(username);
  
  if (!userPermissions) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user permissions'
    }, { status: 500 });
  }
  
  return NextResponse.json({
    success: true,
    data: userPermissions
  });
}
