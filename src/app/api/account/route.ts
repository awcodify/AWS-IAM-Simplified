import { NextResponse } from 'next/server';
import { SimplifiedAWSService } from '@/lib/aws-services';
import { extractCredentialsFromHeaders } from '@/lib/auth-helpers';

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
  const awsService = new SimplifiedAWSService('us-east-1', credentials);
  
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
