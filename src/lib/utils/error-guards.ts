import type { AWSServiceError, AWSThrottlingError } from '@/types/aws';

/**
 * Type guard to check if an error is an AWS Service Error
 */
export function isAWSServiceError(error: unknown): error is AWSServiceError {
  return (
    error instanceof Error &&
    ('name' in error || '__type' in error)
  );
}

/**
 * Type guard to check if an error is a throttling error
 */
export function isThrottlingError(error: unknown): error is AWSThrottlingError {
  if (!isAWSServiceError(error)) {
    return false;
  }
  
  const errorName = error.name || error.__type || '';
  return (
    errorName === 'ThrottlingException' || 
    errorName === 'TooManyRequestsException'
  );
}

/**
 * Safely get error name from an unknown error
 */
export function getErrorName(error: unknown): string {
  if (isAWSServiceError(error)) {
    return error.name || error.__type || 'UnknownError';
  }
  
  if (error instanceof Error) {
    return error.name;
  }
  
  return 'UnknownError';
}

/**
 * Safely get error message from an unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}
