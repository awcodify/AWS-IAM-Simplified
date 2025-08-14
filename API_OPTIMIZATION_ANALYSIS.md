# API Call Optimization Analysis & Implementation

## Analysis Summary

This document outlines the duplicate API calls found in the AWS IAM Simplified application and the optimizations implemented to resolve them.

## Duplicate API Calls Identified

### 1. `/api/account` - Account Information
**Before Optimization:**
- Called in `Header.tsx` on every region change
- Called in `Organization page` when component mounts and regions change
- **Result:** 2 duplicate API calls for the same data

### 2. `/api/permission-sets` - Permission Sets
**Before Optimization:**
- Called in `Dashboard page (/)` for metrics calculation
- Called in `Permission Sets page` for listing permission sets  
- Called in `Risk Analysis page` for risk analysis
- **Result:** 3 duplicate API calls for the same data

### 3. `/api/organization/accounts` - Organization Accounts
**Before Optimization:**
- Called in `Dashboard page (/)` for metrics calculation
- Called in `Organization page` for user access table context
- **Result:** 2 duplicate API calls for the same data

### 4. `/api/organization/users` - Organization Users
**Before Optimization:**
- Called in `Dashboard page (/)` for user count metrics (limit=1)
- Called in `Organization page` for full user listing with pagination
- **Result:** Some redundancy in fetching user data

## Optimizations Implemented

### 1. Created Shared Data Hooks

#### `useAccountInfo` Hook
- **File:** `/src/hooks/useAccountInfo.ts`
- **Purpose:** Centralized account information fetching with caching
- **Features:**
  - Region-based caching
  - Deduplication of concurrent requests
  - Cache invalidation methods

#### `usePermissionSets` Hook
- **File:** `/src/hooks/usePermissionSets.ts`
- **Purpose:** Centralized permission sets fetching with caching
- **Features:**
  - Region + SSO region based caching
  - Deduplication of concurrent requests
  - Cache invalidation methods

#### `useOrganizationAccounts` Hook
- **File:** `/src/hooks/useOrganizationAccounts.ts`
- **Purpose:** Centralized organization accounts fetching with caching
- **Features:**
  - Region-based caching
  - Deduplication of concurrent requests
  - Cache invalidation methods

### 2. Updated Components to Use Shared Hooks

#### Header Component (`/src/components/Header.tsx`)
**Changes:**
- Removed direct `/api/account` fetch
- Now uses `useAccountInfo` hook
- **Result:** Eliminates duplicate account API call

#### Dashboard Page (`/src/app/page.tsx`)
**Changes:**
- Removed direct `/api/permission-sets` and `/api/organization/accounts` fetches
- Now uses `usePermissionSets` and `useOrganizationAccounts` hooks
- Only fetches user count directly (since it needs different parameters)
- **Result:** Eliminates 2 duplicate API calls

#### Organization Page (`/src/app/organization/page.tsx`)
**Changes:**
- Removed direct `/api/account` and `/api/organization/accounts` fetches
- Now uses `useAccountInfo` and `useOrganizationAccounts` hooks
- Simplified `fetchData` function to only fetch users
- **Result:** Eliminates 2 duplicate API calls

#### Permission Sets Page (`/src/app/permission-sets/page.tsx`)
**Changes:**
- Removed direct `/api/permission-sets` fetch
- Now uses `usePermissionSets` hook
- **Result:** Eliminates duplicate permission sets API call

#### Risk Analysis Page (`/src/app/risk-analysis/page.tsx`)
**Changes:**
- Removed direct `/api/permission-sets` fetch
- Now uses `usePermissionSets` hook
- **Result:** Eliminates duplicate permission sets API call

## Benefits of Optimization

### 1. **Reduced Network Requests**
- **Before:** Up to 7 potential duplicate API calls across pages
- **After:** Shared caching eliminates redundant requests

### 2. **Improved Performance**
- Faster page loads due to cached data
- Reduced server load
- Better user experience

### 3. **Better Data Consistency**
- All components using the same data source
- Automatic updates when data changes
- Consistent loading states

### 4. **Improved Code Maintainability**
- Centralized data fetching logic
- Easier to modify API calls in one place
- Reduced code duplication

## Caching Strategy

### Cache Structure
```typescript
// Example cache structure
let cache: { [key: string]: DataType } = {};
let promises: { [key: string]: Promise<DataType> } = {};
```

### Cache Key Patterns
- **Account Info:** `region`
- **Permission Sets:** `${region}-${ssoRegion}`
- **Organization Accounts:** `region`

### Cache Features
1. **Automatic Caching:** Data is cached after first successful fetch
2. **Promise Deduplication:** Concurrent requests are deduplicated
3. **Cache Invalidation:** Methods to clear cache when needed
4. **Error Handling:** Failed requests don't cache and allow retries

## Testing Recommendations

1. **Test Cache Behavior:**
   - Verify data is cached after first load
   - Ensure subsequent calls use cached data
   - Test cache invalidation works correctly

2. **Test Cross-Component Data Sharing:**
   - Navigate between pages and verify no duplicate network requests
   - Check that all components show the same data
   - Verify loading states are consistent

3. **Test Error Handling:**
   - Simulate API failures
   - Verify failed requests don't cache
   - Test retry mechanisms

## Future Improvements

1. **Add Cache TTL (Time To Live):**
   - Implement automatic cache expiration
   - Add refresh mechanisms for stale data

2. **Implement Global State Management:**
   - Consider using Context API or state management library
   - Provide application-wide data sharing

3. **Add Cache Persistence:**
   - Store cache in localStorage for session persistence
   - Implement cache versioning

4. **Monitor Performance:**
   - Add analytics to track API call reduction
   - Monitor cache hit rates
   - Track performance improvements

## Conclusion

The implemented optimizations successfully eliminate duplicate API calls by introducing shared hooks with intelligent caching. This results in better performance, reduced server load, and improved user experience while maintaining code maintainability and data consistency.
