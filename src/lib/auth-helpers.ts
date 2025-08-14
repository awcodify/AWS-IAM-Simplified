/**
 * Helper functions for handling authentication in API routes
 */

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

/**
 * Extract AWS credentials from request headers
 */
export function extractCredentialsFromHeaders(request: Request): AWSCredentials | null {
  const accessKeyId = request.headers.get('x-aws-access-key-id');
  const secretAccessKey = request.headers.get('x-aws-secret-access-key');
  const sessionToken = request.headers.get('x-aws-session-token');

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: sessionToken || undefined
  };
}

/**
 * Extract AWS credentials from request body
 */
export async function extractCredentialsFromBody(request: Request): Promise<AWSCredentials | null> {
  try {
    const body = await request.json();
    const { accessKeyId, secretAccessKey, sessionToken } = body.credentials || {};

    if (!accessKeyId || !secretAccessKey) {
      return null;
    }

    return {
      accessKeyId,
      secretAccessKey,
      sessionToken: sessionToken || undefined
    };
  } catch {
    return null;
  }
}
