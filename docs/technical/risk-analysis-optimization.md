# IAM Risk Analysis Optimization

## Problem Solved

You correctly identified that the original risk analysis approach was inefficient - it was trying to query each individual account to get permission set details, when in fact:

1. **AWS SSO/Identity Center is centralized** - Permission sets are managed from the organization (management) account
2. **No need for cross-account queries** - All permission set details can be fetched from the central SSO instance
3. **Duplicate API calls** - The same permission sets were being queried multiple times for different users

## Optimization Implemented

### Before (Inefficient):
```
For each user:
  For each account access:
    For each permission set:
      → Call getPermissionSetDetails() from individual account
      → Potential for duplicate calls
      → Cross-account API calls
```

### After (Optimized):
```
1. Extract all unique permission sets across all users
2. Get SSO instance ARN from organization account (once)
3. Call getPermissionSetDetails() once per unique permission set
4. Cache and reuse enriched permission set data for all users
```

## Benefits

1. **Reduced API Calls**: From O(users × accounts × permission_sets) to O(unique_permission_sets)
2. **No Cross-Account Queries**: All calls go to the central SSO service
3. **Better Performance**: Significantly faster analysis for large organizations
4. **Lower Rate Limiting Risk**: Fewer API calls mean less chance of hitting AWS API limits
5. **Follows AWS Best Practices**: Uses centralized SSO management as intended

## Example Impact

For an organization with:
- 100 users
- 5 accounts per user on average
- 3 permission sets per account

**Before**: 100 × 5 × 3 = 1,500 API calls
**After**: ~15 unique permission sets = 15 API calls

**99% reduction in API calls!**

## Implementation Details

The optimized approach:

1. **Collects unique permission sets** from all users before analysis
2. **Gets SSO instance ARN** from the organization account
3. **Batch-fetches permission set details** for all unique permission sets
4. **Caches enriched data** in a Map for reuse
5. **Maps enriched data** back to each user's permission sets during analysis

This follows the same pattern as your permission sets page, which correctly queries the central SSO service rather than individual accounts.
