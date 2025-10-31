/**
 * AWS Regions Configuration
 * Centralized list of AWS regions used throughout the application
 */

export interface AWSRegion {
  value: string;
  label: string;
}

/**
 * Complete list of AWS regions
 * Use this list for all region selectors in the application
 */
export const AWS_REGIONS: AWSRegion[] = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-west-3', label: 'Europe (Paris)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'eu-north-1', label: 'Europe (Stockholm)' },
  { value: 'eu-south-1', label: 'Europe (Milan)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
  { value: 'af-south-1', label: 'Africa (Cape Town)' },
  { value: 'me-south-1', label: 'Middle East (Bahrain)' },
];

/**
 * Default AWS region
 * Used as fallback when no region is specified
 */
export const DEFAULT_AWS_REGION = 'us-east-1';

/**
 * Default Identity Center (SSO) region
 * Used as fallback when no Identity Center region is specified
 */
export const DEFAULT_IDENTITY_CENTER_REGION = 'us-east-1';
