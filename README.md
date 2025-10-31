# AWS IAM Simplified

A simplified web dashboard for AWS IAM management that helps you easily understand what resources users can access across AWS accounts in your organization.

## 🎯 Purpose

Managing IAM in AWS Organizations can be complex, especially when you need to understand cross-account access. This dashboard simplifies the process by providing an organization-wide view:

**"What users exist across my organization and which accounts does user X have access to?"**

## ✨ Features

- **Organization View** (Management Account Required)
  - List all accounts in your AWS Organization
  - See which users have access to which accounts
  - Cross-account user access verification
  - Visual representation of user permissions across the organization

- **Permission Sets** (SSO-Enabled Account Required)
  - View and manage AWS SSO permission sets
  - Detailed permission set policies
  - Permission set assignments across accounts

- **Risk Analysis** (SSO-Enabled Account Required)
  - Real-time security risk assessment
  - Identify overly permissive permission sets
  - Track privileged access across organization

- **Real-time data** - Fetches live data from AWS IAM and Organizations APIs
- **Clean, modern UI** - Built with Next.js and Tailwind CSS
- **Account information** - Displays current AWS account details

## ⚠️ Important: Account Requirements

Different features require different AWS account credentials. **Please read [ACCOUNT_REQUIREMENTS.md](./ACCOUNT_REQUIREMENTS.md)** to understand which account to use for each feature.

**Quick Reference:**
- 🏢 **Organization Users** → Management Account
- 🛡️ **Permission Sets** → SSO-Enabled Account  
- 🔍 **Risk Analysis** → SSO-Enabled Account

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- AWS credentials configured (see setup below)
- Understanding of which AWS account to use (see [ACCOUNT_REQUIREMENTS.md](./ACCOUNT_REQUIREMENTS.md))

### Installation

1. Clone and install dependencies:
```bash
git clone <your-repo>
cd aws-iam-simplified
npm install
```

2. Set up AWS credentials (choose one method):

**Option A: AWS SSO (Recommended for Multiple Accounts)**
```bash
# Configure SSO for management account
aws configure sso --profile management

# Configure SSO for SSO-admin account (if different)
aws configure sso --profile sso-admin

# Use the appropriate profile
export AWS_PROFILE=management
```

**Option B: AWS CLI**
```bash
aws configure
```

**Option C: Environment Variables**
```bash
cp .env.example .env.local
# Edit .env.local with your AWS credentials and region settings
```

### Environment Configuration

The application supports two types of region configuration:

1. **AWS Operations Region**: Used for IAM, Organizations, and general AWS service calls
2. **IAM Identity Center Region**: Used for Identity Center (SSO) operations

#### Option 1: Configure via Environment Variables (Optional)

Create a `.env.local` file:

```bash
# AWS Profile (if using AWS CLI profiles)
AWS_PROFILE=your-aws-profile-name

# Default IAM Identity Center region (optional - can be changed in UI)
NEXT_PUBLIC_AWS_SSO_REGION=us-east-1

# Default AWS Operations region (optional - can be changed in UI)
NEXT_PUBLIC_AWS_DEFAULT_REGION=us-east-1
```

#### Option 2: Configure via Settings Page (Recommended)

Both regions can be configured directly in the application:

1. Login to the application
2. Navigate to **Settings** → **Regions** tab
3. Configure both:
   - **AWS Operations Region**: Primary region for IAM and Organizations
   - **IAM Identity Center Region**: Region where your Identity Center is deployed

**Important Notes:**
- Both regions are saved in your browser's localStorage and persist across sessions
- The **Identity Center Region** must match where your IAM Identity Center is actually deployed
- The **AWS Operations Region** can be changed based on your needs
- During login, you'll select the AWS Operations region (all 21 AWS regions available)

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 AWS Setup

### For Organization View (Management Account Only)

**Requirements:**
1. Must be using the **management account** of your AWS Organization
2. AWS Organizations must be enabled
3. Cross-account roles must be set up in member accounts

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

### Credential Configuration

**Method 1: AWS CLI (Recommended)**
```bash
aws configure
```

**Method 2: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

**Method 3: IAM Roles (for EC2/Lambda)**
- Attach the IAM role with required permissions to your EC2 instance or Lambda function

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
│   ├── api/
│   │   ├── account/route.ts          # Get AWS account info
│   │   └── organization/
│   │       ├── accounts/route.ts     # List organization accounts
│   │       └── users/route.ts        # Get organization-wide user access
│   └── page.tsx                      # Main dashboard page
├── components/
│   ├── PermissionView.tsx            # Permission display component
│   └── UserListContainer.tsx         # Organization-wide user view
├── lib/
│   └── aws-service.ts                # AWS SDK wrapper
└── types/
    └── aws.ts                        # TypeScript types
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

### Organization View Issues
- **"No organization accounts found"**: Make sure you're using the management account with AWS Organizations enabled
- **"Failed to retrieve organization users"**: Verify cross-account roles are set up in member accounts
- **Users show "no access" to accounts**: Check that `OrganizationAccountAccessRole` exists in member accounts and has proper permissions

### "User not found"
- Verify the username exists in your AWS account
- Check that the user is in the same AWS account you're authenticated to
- Try refreshing the user list to see if new users have been added

### TypeScript Errors
```bash
npm run build
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel
```

### Docker
```bash
docker build -t aws-iam-dashboard .
docker run -p 3000:3000 -e AWS_ACCESS_KEY_ID=xxx -e AWS_SECRET_ACCESS_KEY=xxx aws-iam-dashboard
```

## 📝 License

MIT License - feel free to use this project for your own AWS IAM management needs!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
