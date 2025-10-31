# Cross-Account Setup Guide for Management Account Features

This guide helps you set up AWS Organizations cross-account access for the Management Account Features page (`/accounts/management`).

## Overview

The Management Account Features page allows you to:
- View organization-wide users from IAM Identity Center
- See all accounts in your AWS Organization
- Verify cross-account access for users (optional, requires cross-account roles)

Cross-account roles are **optional** for basic functionality (viewing users and accounts), but **required** if you want to verify which IAM users have access in each member account.

## Prerequisites

1. **Management Account**: You must be using the AWS Organizations management account
2. **AWS Organizations**: Must be enabled in your organization
3. **Cross-Account Roles**: Required in each member account

## Step 1: Verify Management Account

The application automatically detects if you're using a management account when you login. You'll see a green "Management Account" badge on the dashboard if detected.

**Optional: Verify via AWS CLI (if installed)**

If you want to verify manually before logging in:

```bash
aws organizations describe-organization
```

If this returns organization details, you're in the management account. If you get an error, you're likely in a member account.

## Step 2: Create Cross-Account Role in Member Accounts

For each member account, create a role that allows the management account to assume it.

### Trust Policy (Replace MANAGEMENT-ACCOUNT-ID with your management account ID):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::MANAGEMENT-ACCOUNT-ID:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Permissions Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:ListUsers",
        "iam:GetUser",
        "iam:ListAttachedUserPolicies",
        "iam:ListUserPolicies",
        "iam:GetUserPolicy",
        "iam:ListGroupsForUser"
      ],
      "Resource": "*"
    }
  ]
}
```

### Role Name
The default role name expected by the application is: `OrganizationAccountAccessRole`

## Step 3: CLI Commands to Create the Role

Run these commands in each member account:

```bash
# Create the trust policy file
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR-MANAGEMENT-ACCOUNT-ID:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the permissions policy file
cat > permissions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:ListUsers",
        "iam:GetUser",
        "iam:ListAttachedUserPolicies",
        "iam:ListUserPolicies",
        "iam:GetUserPolicy",
        "iam:ListGroupsForUser"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name OrganizationAccountAccessRole \
  --assume-role-policy-document file://trust-policy.json

# Create and attach the policy
aws iam create-policy \
  --policy-name OrganizationAccountAccessPolicy \
  --policy-document file://permissions-policy.json

# Get the policy ARN (replace YOUR-ACCOUNT-ID with the member account ID)
aws iam attach-role-policy \
  --role-name OrganizationAccountAccessRole \
  --policy-arn arn:aws:iam::YOUR-ACCOUNT-ID:policy/OrganizationAccountAccessPolicy
```

## Step 4: Test the Setup

Once roles are created in member accounts, test the Management Account Features page at `/accounts/management`. Users from the management account should show their access status across all organization accounts.

## Note on Identity Center Users

The Management Account Features page primarily displays users from **IAM Identity Center** (AWS SSO). These are centrally managed users that can be assigned access to multiple accounts through permission sets.

If you don't have Identity Center enabled, the page will fall back to showing IAM users from the management account.

## Troubleshooting

### "AccessDeniedException" when listing organization accounts
- Verify you're using the management account credentials
- Ensure AWS Organizations is enabled

### "AssumeRole failed" for member accounts
- Check that the cross-account role exists in the member account
- Verify the trust policy allows your management account
- Ensure the role has the required IAM permissions
- **Note**: This only affects cross-account access verification, not basic user listing

### No users showing up
- Verify IAM Identity Center is configured in your organization
- Check that users exist in the Identity Center directory
- Ensure you have permissions to list Identity Center users

### Performance Considerations
- Checking user access across many accounts can take time
- The bulk access loading feature optimizes this by batching requests
- Consider the number of accounts when planning for production use
