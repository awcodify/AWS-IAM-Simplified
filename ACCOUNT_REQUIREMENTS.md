# Account Requirements Guide

This guide explains which AWS account credentials you need for each feature of AWS IAM Simplified.

## Overview

AWS IAM Simplified connects to different AWS services that may be configured in different accounts within your organization. Understanding which account to use for each feature is crucial for proper functionality.

## Quick Reference

| Feature | Required Account | Why |
|---------|-----------------|-----|
| **Organization Users** | Management Account | AWS Organizations API is only accessible from the management account |
| **Permission Sets** | SSO-Enabled Account | Permission sets are managed where IAM Identity Center is configured |
| **Risk Analysis** | SSO-Enabled Account | Requires permission set and user data from SSO |
| **Dashboard** | Any Account | Shows aggregated data from other features |

## Detailed Requirements

### 1. Organization Users Page (`/organization`)

**Required Account:** AWS Organizations Management Account

**Why:**
- Organization user data and account lists are only accessible through the AWS Organizations API
- The Organizations API requires credentials from the management account
- Member accounts cannot access organization-wide user information

**How to Verify You're Using the Management Account:**
```bash
# Run this command to check if you're in the management account
aws organizations describe-organization

# If successful, you'll see organization details
# If it fails, you're likely in a member account
```

**Common Issues:**
- ❌ "AccessDeniedException" - You're not using management account credentials
- ❌ "AWSOrganizationsNotInUseException" - Organizations is not enabled
- ❌ Empty user list - May indicate permission issues or wrong account

---

### 2. Permission Sets Page (`/permission-sets`)

**Required Account:** Account with IAM Identity Center (SSO) Enabled

**Why:**
- Permission sets are AWS SSO resources
- They exist in the account where IAM Identity Center is configured
- Typically the management account, but can be a delegated administrator

**How to Verify SSO is Enabled:**
```bash
# List SSO instances in your account
aws sso-admin list-instances

# If successful, you'll see your SSO instance details
```

**Common Issues:**
- ❌ "AccessDeniedException" - SSO not enabled in this account
- ❌ Empty permission set list - Wrong account or no permission sets configured
- ❌ "ResourceNotFoundException" - SSO instance not found

---

### 3. Risk Analysis Page (`/risk-analysis`)

**Required Account:** Account with IAM Identity Center (SSO) Enabled

**Why:**
- Analyzes permission sets (requires SSO account)
- Evaluates user assignments (requires SSO account)
- Combines data from multiple SSO resources

**Dependencies:**
- Same as Permission Sets page
- Also requires Organization Users data if analyzing cross-account access

**Common Issues:**
- ❌ Cannot load permission sets - Wrong account
- ❌ Incomplete risk analysis - Missing permissions to read policies

---

## Setting Up Credentials

### Option 1: AWS SSO Login (Recommended)

```bash
# Configure SSO profile for management account
aws configure sso
# Follow prompts to set up management account profile

# Use the profile
export AWS_PROFILE=management-account

# Start the application
npm run dev
```

### Option 2: Environment Variables

```bash
# For management account access
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

npm run dev
```

### Option 3: Switch Profiles During Use

You can switch AWS profiles without restarting the application:

```bash
# Terminal 1: Start the app
npm run dev

# Terminal 2: Switch profile
export AWS_PROFILE=management-account

# The app will use the new profile for subsequent requests
```

## Best Practices

### 1. **Use AWS SSO for Multiple Accounts**
If your organization uses AWS SSO, configure profiles for each account you need:

```bash
# Management account profile
aws configure sso --profile management

# SSO admin account profile (if delegated)
aws configure sso --profile sso-admin
```

### 2. **Verify Before Use**
Before accessing a feature, verify you're using the correct credentials:

```bash
# Check current identity
aws sts get-caller-identity

# Should show the account ID you expect
```

### 3. **Keep Credentials Secure**
- Never commit credentials to version control
- Use environment variables or AWS SSO
- Rotate access keys regularly
- Use least-privilege IAM policies

## Troubleshooting

### "I see limited data or errors"

**Solution:** Check if you're using the correct account for that feature.

```bash
# 1. Check current account
aws sts get-caller-identity

# 2. Check if it's the management account
aws organizations describe-organization

# 3. Check if SSO is available
aws sso-admin list-instances
```

### "Permission denied errors"

**Solution:** Ensure your IAM user/role has the required permissions:

**For Organization Users:**
- `organizations:ListAccounts`
- `organizations:DescribeOrganization`
- `identitystore:ListUsers`

**For Permission Sets:**
- `sso:ListInstances`
- `sso-admin:ListPermissionSets`
- `sso-admin:DescribePermissionSet`
- `sso-admin:GetInlinePolicyForPermissionSet`

### "No data showing up"

**Possible causes:**
1. Wrong AWS account credentials
2. Wrong AWS region selected
3. No data exists in that account
4. Insufficient IAM permissions

**Debug steps:**
1. Verify account: `aws sts get-caller-identity`
2. Verify region: Check region selector in app
3. Verify permissions: Try AWS CLI commands manually
4. Check browser console for API errors

## FAQ

**Q: Can I use a member account for Organization Users?**  
A: No, you must use the management account. Member accounts don't have permission to list organization-wide users.

**Q: What if SSO is configured in a delegated administrator account?**  
A: Use credentials for the delegated administrator account when accessing Permission Sets and Risk Analysis features.

**Q: Do I need to restart the app when switching accounts?**  
A: No, you can switch AWS profiles in your terminal. The app will use the new profile for new requests. You may need to refresh the page.

**Q: Can I use the same account for all features?**  
A: Yes, if your management account also has IAM Identity Center enabled, you can use it for all features.

**Q: How do I know which account has SSO enabled?**  
A: Run `aws sso-admin list-instances` in each account. The account that returns SSO instance details is your SSO-enabled account.

## Additional Resources

- [AWS Organizations Documentation](https://docs.aws.amazon.com/organizations/)
- [AWS IAM Identity Center Documentation](https://docs.aws.amazon.com/singlesignon/)
- [AWS CLI Configuration Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [Setting up AWS SSO](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
