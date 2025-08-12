import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';

export async function GET() {
  const awsService = new AWSService();
  const users = await awsService.listUsers();
  
  return NextResponse.json({
    success: true,
    data: users
  });
}
