# AWS IAM Simplified

A simplified web dashboard for AWS IAM management that helps you easily understand what resources users can access across AWS accounts in your organization.

## 🎯 Purpose

Managing IAM in AWS Organizations can be complex, especially when you need to understand cross-account access. This dashboard simplifies the process by providing multiple views based on your AWS account type:

**"What users exist across my organization and which accounts does user X have access to?"**

## ✨ Features

### Management Account Features (`/accounts/management`)
Requires AWS Organizations Management Account:
- List all accounts in your AWS Organization
- See organization-wide users (from Identity Center)
- Cross-account user access verification
- Visual representation of user permissions across the organization
- Bulk access loading for efficient querying

### Local IAM Account Features (`/accounts/iam`)
Works with any AWS account:
- View local IAM users in the current account
- Detailed permission analysis for each user
- Inline policy viewing
- Managed policy inspection
- Group membership tracking

### SSO-Enabled Account Features
Requires IAM Identity Center (AWS SSO) enabled:

- **Permission Sets** (`/permission-sets`)
  - View and manage AWS SSO permission sets
  - Detailed permission set policies
  - Permission set assignments across accounts

- **Risk Analysis** (`/risk-analysis`)
  - Real-time security risk assessment with streaming progress
  - Identify overly permissive permission sets
  - Track privileged access across organization
  - Session-based scanning that persists across navigation

### Additional Features
- **Settings Page** (`/settings`) - Configure AWS and Identity Center regions
- **Account Type Detection** - Automatic capability detection
- **Real-time data** - Fetches live data from AWS IAM and Organizations APIs
- **Clean, modern UI** - Built with Next.js and Tailwind CSS
- **Account information** - Displays current AWS account details

For a complete list of all features, see **[Features Documentation](./docs/features.md)**.

## ⚠️ Important: Account Requirements

Different features require different AWS account credentials. **Please read [Account Requirements](./docs/account-requirements.md)** to understand which account to use for each feature.

**Quick Reference:**
- 🏢 **Management Account Features** (`/accounts/management`) → Management Account
- 👤 **Local IAM Users** (`/accounts/iam`) → Any AWS Account
- ️ **Permission Sets** (`/permission-sets`) → SSO-Enabled Account  
- 🔍 **Risk Analysis** (`/risk-analysis`) → SSO-Enabled Account

## 🏗️ Architecture Overview

This application is designed to work with three different types of AWS account configurations:

### 1. Management Account Access
When you authenticate with your **AWS Organizations Management Account**, you get access to:
- Organization-wide user listing from Identity Center
- All accounts in your organization
- Cross-account access verification (when cross-account roles are configured)

**Page**: `/accounts/management`

### 2. Local IAM Account Access
When you authenticate with **any AWS account**, you can view:
- Local IAM users in that specific account
- Detailed permissions for each IAM user
- Attached policies (managed and inline)
- Group memberships

**Page**: `/accounts/iam`

### 3. SSO-Enabled Account Access
When you authenticate with an account that has **IAM Identity Center enabled** (typically the management account or a delegated administrator), you can:
- View and analyze permission sets
- Perform risk analysis on permission set configurations
- See permission set assignments

**Pages**: `/permission-sets` and `/risk-analysis`

The application automatically detects your account's capabilities and displays appropriate indicators on the dashboard.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- AWS IAM user credentials (Access Key ID and Secret Access Key)
- Understanding of which AWS account to use (see [Account Requirements](./docs/account-requirements.md))

### Installation

1. Clone and install dependencies:
```bash
git clone <your-repo>
cd aws-iam-simplified
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Login with your AWS credentials:
   - Enter your AWS Access Key ID
   - Enter your AWS Secret Access Key
   - Select your AWS region
   - Your credentials are securely stored in your browser's localStorage

### Region Configuration

The application supports two types of region configuration:

1. **AWS Operations Region**: Used for IAM, Organizations, and general AWS service calls
2. **IAM Identity Center Region**: Used for Identity Center (SSO) operations

**Configure regions via Settings Page:**

1. After logging in, navigate to **Settings** → **Regions** tab
2. Configure both regions:
   - **AWS Operations Region**: Primary region for IAM and Organizations
   - **IAM Identity Center Region**: Region where your Identity Center is deployed

**Important Notes:**
- Both regions are saved in your browser's localStorage and persist across sessions
- The **Identity Center Region** must match where your IAM Identity Center is actually deployed
- The **AWS Operations Region** can be changed based on your needs
- You can also select the AWS Operations region during login (all 21 AWS regions available)

## 🔧 AWS Setup

### For Management Account Features (Management Account Only)

Access the management account features at `/accounts/management`.

**Requirements:**
1. Must be using the **management account** of your AWS Organization
2. AWS Organizations must be enabled
3. Cross-account roles must be set up in member accounts (for cross-account access verification)

**See [Cross-Account Setup Guide](./docs/setup-cross-account.md) for detailed instructions.**

**Required Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "organizations:ListAccounts",
        "organizations:DescribeOrganization",
        "iam:ListUsers",
        "iam:GetUser",
        "iam:ListAttachedUserPolicies",
        "iam:ListUserPolicies",
        "iam:GetUserPolicy",
        "iam:ListGroupsForUser",
        "sts:GetCallerIdentity",
        "sts:AssumeRole"
      ],
      "Resource": "*"
    }
  ]
}
```

**Cross-Account Access Setup:**

In each member account, create a role that the management account can assume:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::MANAGEMENT-ACCOUNT-ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "your-org-external-id"
        }
      }
    }
  ]
}
```

Role name: `OrganizationAccountAccessRole` (default) or customize in the code.

**Permissions for the cross-account role:**
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

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **AWS SDK**: AWS SDK for JavaScript v3
- **Icons**: Lucide React
- **Styling**: Tailwind CSS

## 📁 Project Structure

```
src/
├── app/
│   ├── accounts/
│   │   ├── management/page.tsx       # Organization users (management account)
│   │   ├── iam/page.tsx              # Local IAM users (any account)
│   │   └── identity-center/page.tsx  # Deprecated (redirects to management)
│   ├── api/
│   │   ├── account/route.ts          # Get AWS account info
│   │   ├── organization/
│   │   │   ├── accounts/route.ts     # List organization accounts
│   │   │   └── users/                # Organization user endpoints
│   │   ├── iam/users/                # IAM user endpoints
│   │   ├── permission-sets/          # Permission set endpoints
│   │   └── risk-analysis/            # Risk analysis endpoints
│   ├── permission-sets/page.tsx      # Permission sets page
│   ├── risk-analysis/page.tsx        # Risk analysis page
│   ├── settings/page.tsx             # Settings and region configuration
│   └── page.tsx                      # Main dashboard/navigation page
├── components/
│   ├── UserAccessTable.tsx           # User access display
│   ├── PermissionView.tsx            # Permission display component
│   ├── RiskDashboard.tsx             # Risk analysis dashboard
│   ├── AccountTypeIndicator.tsx      # Account capability indicators
│   └── ...                           # Other UI components
├── hooks/
│   ├── useAccountInfo.ts             # Cached account info hook
│   ├── usePermissionSets.ts          # Cached permission sets hook
│   ├── useOrganizationAccounts.ts    # Cached org accounts hook
│   ├── useIAMUsers.ts                # IAM users hook
│   └── useStreamingRiskAnalysis.ts   # Streaming risk analysis hook
├── lib/
│   ├── aws-services/                 # Modular AWS service architecture
│   │   ├── account-service.ts        # Account operations
│   │   ├── organization-service.ts   # Organization operations
│   │   ├── sso-service.ts            # SSO/Identity Center operations
│   │   ├── user-service.ts           # User operations
│   │   └── index.ts                  # Main AWSService orchestrator
│   ├── scan-session-manager.ts       # Risk scan session management
│   └── ...                           # Other utilities
├── contexts/
│   ├── AuthContext.tsx               # Authentication context
│   └── RegionContext.tsx             # Region configuration context
└── types/
    ├── aws.ts                        # AWS-related TypeScript types
    └── risk-analysis.ts              # Risk analysis types
```

## 🎨 Design Principles

1. **Keep everything simple** - No overengineering
2. **Use existing AWS SDK** - Leverage proven, maintained libraries
3. **Focus on core functionality** - Answer the key question efficiently

## 🐛 Troubleshooting

### "AWS Connection Failed"
- Verify your AWS credentials are configured correctly
- Check that your AWS user has the required IAM permissions
- Ensure your AWS region is supported

### Management Account Features Issues
- **"No organization accounts found"**: Make sure you're using the management account with AWS Organizations enabled
- **"Failed to retrieve organization users"**: Verify you're in the management account and Identity Center is set up
- **Users show "no access" to accounts**: Check that cross-account roles exist in member accounts (optional for basic user listing)

### Local IAM Account Features Issues
- **"No IAM users found"**: Verify IAM users exist in the current account
- **Permission details not loading**: Check IAM permissions for the authenticated user
- **Empty policy documents**: User may not have any policies attached

### Permission Sets and Risk Analysis Issues
- **"IAM Identity Center not accessible"**: Ensure you're using an account with Identity Center enabled
- **"No permission sets found"**: Identity Center may not be configured or no permission sets exist
- **Risk analysis not starting**: Verify permission sets are loaded first

### "User not found"
- Verify the username exists in your AWS account
- Check that the user is in the same AWS account you're authenticated to
- Try refreshing the user list to see if new users have been added

### Region Configuration Issues
- **Wrong region selected**: Use the Settings page to configure both AWS Operations Region and Identity Center Region
- **Identity Center region mismatch**: Ensure the Identity Center region matches where it's actually deployed
- **Data not loading**: Try switching regions in Settings and back

### TypeScript Errors
```bash
npm run build
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel
```

After deployment, access your app and login with your AWS credentials through the web interface.

### Docker
```bash
docker build -t aws-iam-dashboard .
docker run -p 3000:3000 aws-iam-dashboard
```

After starting the container, navigate to the application and login with your AWS credentials through the web interface.

## � Documentation

For detailed documentation, see the [`docs/`](./docs/) folder:

- **[Features Documentation](./docs/features.md)** - Complete feature list and descriptions
- **[Account Requirements](./docs/account-requirements.md)** - Which account to use for each feature
- **[Cross-Account Setup](./docs/setup-cross-account.md)** - Setting up cross-account access
- **[Technical Documentation](./docs/technical/)** - Architecture and implementation details

## �📝 License

MIT License - feel free to use this project for your own AWS IAM management needs!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
