import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';

export async function GET() {
  const awsService = new AWSService();
  const accountInfo = await awsService.getAccountInfo();
  
  if (!accountInfo) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get account information'
    }, { status: 500 });
  }
  
  return NextResponse.json({
    success: true,
    data: accountInfo
  });
}
