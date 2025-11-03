/**
 * API Configuration Constants
 * 
 * Centralized configuration values for API operations, caching, retries, and timeouts.
 * These constants can be overridden by environment variables where applicable.
 */

// ============================================
// Session Management
// ============================================

/**
 * Session timeout duration in milliseconds
 * Default: 1 hour (3600000ms)
 */
export const SESSION_TIMEOUT = 60 * 60 * 1000;

// ============================================
// Caching Configuration
// ============================================

/**
 * Cache TTL for account information
 * Default: 5 minutes (300000ms)
 */
export const ACCOUNT_INFO_CACHE_TTL = 5 * 60 * 1000;

/**
 * Cache TTL for permission sets
 * Default: 5 minutes (300000ms)
 */
export const PERMISSION_SETS_CACHE_TTL = 5 * 60 * 1000;

/**
 * Cache TTL for organization accounts
 * Default: 5 minutes (300000ms)
 */
export const ORGANIZATION_ACCOUNTS_CACHE_TTL = 5 * 60 * 1000;

/**
 * Scan session validity duration
 * Sessions older than this are considered stale
 * Default: 1 hour (3600000ms)
 */
export const SCAN_SESSION_TIMEOUT = 60 * 60 * 1000;

// ============================================
// AWS API Retry Configuration
// ============================================

/**
 * Maximum number of retry attempts for throttled AWS API calls
 * Default: 3 retries
 */
export const API_MAX_RETRIES = 3;

/**
 * Initial delay for exponential backoff in milliseconds
 * Subsequent delays: initialDelay * 2^attempt
 * Default: 1000ms (1 second)
 */
export const API_INITIAL_RETRY_DELAY = 1000;

// ============================================
// AWS Region Configuration
// ============================================

/**
 * Default AWS region for operations
 * Can be overridden by environment variable AWS_REGION
 * or user preferences in localStorage
 */
export const DEFAULT_AWS_REGION = 'us-east-1';

/**
 * Default Identity Center (SSO) region
 * Note: Identity Center is regional and must match actual deployment
 */
export const DEFAULT_SSO_REGION = 'us-east-1';

// ============================================
// Cross-Account Access
// ============================================

/**
 * Default cross-account role name for accessing member accounts
 * Can be overridden by environment variable AWS_ORGANIZATION_ROLE_NAME
 */
export const DEFAULT_CROSS_ACCOUNT_ROLE = 'OrganizationAccountAccessRole';

// ============================================
// API Pagination
// ============================================

/**
 * Default page size for paginated API requests
 * Used for IAM users, permission sets, etc.
 */
export const DEFAULT_PAGE_SIZE = 100;

/**
 * Maximum items to fetch in a single request
 * Prevents excessive memory usage
 */
export const MAX_ITEMS_PER_REQUEST = 1000;

// ============================================
// Feature Flags
// ============================================

/**
 * Enable risk analysis feature
 * Can be disabled for performance or security reasons
 */
export const ENABLE_RISK_ANALYSIS = true;

/**
 * Enable bulk loading of user data
 * Improves performance but increases API calls
 */
export const ENABLE_BULK_LOADING = true;
