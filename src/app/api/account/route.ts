import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';

export async function GET() {
  console.log('Environment AWS_PROFILE:', process.env.AWS_PROFILE);
  
  const awsService = new AWSService();
  const accountInfo = await awsService.getAccountInfo();
  
  return NextResponse.json({
    success: true,
    data: accountInfo
  });
}
