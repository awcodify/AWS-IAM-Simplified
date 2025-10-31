# Account Requirements Guide

This guide explains which AWS account credentials you need for each feature of AWS IAM Simplified.

> **💡 Tip**: See [Features Documentation](./features.md) for a complete list of all features.

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

The application uses a web-based login system where you enter your AWS credentials directly:

1. Start the application:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000)

3. Login with your AWS credentials:
   - Enter your AWS Access Key ID
   - Enter your AWS Secret Access Key  
   - Select your AWS region
   - Credentials are securely stored in browser's localStorage

4. To switch accounts:
   - Logout from the current session
   - Login again with different AWS credentials

## Best Practices

### 1. **Use Different Credentials for Different Features**
Depending on which features you need, login with the appropriate AWS account:
- Management account for organization features
- SSO-enabled account for permission sets and risk analysis
- Any account for local IAM user features

### 2. **Verify Before Use**
The dashboard automatically detects your account capabilities and shows indicators for:
- Management account access
- IAM account access
- Identity Center availability

### 3. **Keep Credentials Secure**
- Never share your AWS credentials
- Rotate access keys regularly
- Use least-privilege IAM policies
- Logout when finished using the application

## Troubleshooting

### "I see limited data or errors"

**Solution:** Check if you're logged in with the correct account credentials for that feature.

The dashboard shows account capability indicators that help you verify:
- ✅ Green badge = Account has access to this feature
- ❌ Red badge = Account doesn't have access or missing permissions

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
1. Wrong AWS account credentials entered
2. Wrong AWS region selected
3. No data exists in that account
4. Insufficient IAM permissions

**Debug steps:**
1. Check account ID displayed in the header
2. Verify region in Settings page
3. Check account capability indicators on dashboard
4. Try logging out and back in with correct credentials

## FAQ

**Q: Can I use a member account for Organization Users?**  
A: No, you must use the management account. Member accounts don't have permission to list organization-wide users.

**Q: What if SSO is configured in a delegated administrator account?**  
A: Use credentials for the delegated administrator account when accessing Permission Sets and Risk Analysis features.

**Q: Do I need to restart the app when switching accounts?**  
A: No, simply logout and login with different credentials. The app will immediately use the new account.

**Q: Can I use the same account for all features?**  
A: Yes, if your management account also has IAM Identity Center enabled, you can use it for all features.

**Q: How do I know which account has SSO enabled?**  
A: After logging in, check the dashboard. It will show account capability indicators including whether Identity Center is available in that account.

## Additional Resources

- [AWS Organizations Documentation](https://docs.aws.amazon.com/organizations/)
- [AWS IAM Identity Center Documentation](https://docs.aws.amazon.com/singlesignon/)
- [AWS CLI Configuration Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [Setting up AWS SSO](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [Cross-Account Setup Guide](./setup-cross-account.md) - For management account features
