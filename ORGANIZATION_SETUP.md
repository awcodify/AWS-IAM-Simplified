# Organization Setup Guide

This guide helps you set up AWS Organizations cross-account access for the organization view.

## Prerequisites

1. **Management Account**: You must be using the AWS Organizations management account
2. **AWS Organizations**: Must be enabled in your organization
3. **Cross-Account Roles**: Required in each member account

## Step 1: Verify Management Account

Check if you're in the management account:

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

Once roles are created in member accounts, test the organization view in the dashboard. Users from the management account should show their access status across all organization accounts.

## Troubleshooting

### "AccessDeniedException" when listing organization accounts
- Verify you're using the management account credentials
- Ensure AWS Organizations is enabled

### "AssumeRole failed" for member accounts
- Check that the cross-account role exists in the member account
- Verify the trust policy allows your management account
- Ensure the role has the required IAM permissions

### Performance Considerations
- Checking user access across many accounts can take time
- Consider limiting the number of accounts or implementing caching for production use
