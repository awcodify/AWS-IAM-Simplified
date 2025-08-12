import { NextRequest, NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-service';

export async function GET() {
  const awsService = new AWSService();
  
  try {
    const users = await awsService.listUsers();
    
    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error listing users:', error);
    
    let errorMessage = 'Failed to list users';
    
    if (error instanceof Error) {
      if (error.name === 'AccessDenied') {
        errorMessage = 'Access denied. Please check your IAM permissions.';
      } else if (error.name === 'NoCredentialsError') {
        errorMessage = 'AWS credentials not configured';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
