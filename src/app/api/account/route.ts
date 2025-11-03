import { NextResponse } from 'next/server';
import { AWSService } from '@/lib/aws-services';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';
import { DEFAULT_AWS_REGION } from '@/constants/api';

export async function GET(request: Request) {
  // Extract credentials from headers
  const credentials = extractCredentialsFromHeaders(request);
  if (!credentials) {
    return NextResponse.json({
      success: false,
      error: 'AWS credentials not provided'
    }, { status: 401 });
  }
  
  // Pass credentials to the AWS service
  const awsService = new AWSService(DEFAULT_AWS_REGION, credentials);
  
  try {
    const accountInfo = await awsService.getAccountInfo();
    
    return NextResponse.json({
      success: true,
      data: accountInfo
    });
  } catch (error) {
    console.error('Error getting account info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get account information'
    }, { status: 500 });
  }
}
