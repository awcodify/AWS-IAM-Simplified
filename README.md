# AWS IAM Dashboard

A simplified web dashboard for AWS IAM management that helps you easily understand what resources users can access across AWS accounts in your organization.

## 🎯 Purpose

Managing IAM in AWS Organizations can be complex, especially when you need to understand cross-account access. This dashboard simplifies the process by providing both single-account and organization-wide views:

**"What users exist across my organization and which accounts does user X have access to?"**

## ✨ Features

- **Single Account View**
  - View all IAM users in your current AWS account
  - Click to see detailed permissions for any user
  - Shows attached policies, inline policies, and group memberships

- **Organization View** (Management Account)
  - List all accounts in your AWS Organization
  - See which users have access to which accounts
  - Cross-account user access verification
  - Visual representation of user permissions across the organization

- **Real-time data** - Fetches live data from AWS IAM and Organizations APIs
- **Clean, modern UI** - Built with Next.js and Tailwind CSS
- **Account information** - Displays current AWS account details

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- AWS credentials configured (see setup below)

### Installation

1. Clone and install dependencies:
```bash
git clone <your-repo>
cd aws-iam-simplified
npm install
```

2. Set up AWS credentials (choose one method):

**Option A: AWS CLI**
```bash
aws configure
```

**Option B: Environment Variables**
```bash
cp .env.example .env.local
# Edit .env.local with your AWS credentials and region settings
```

### Environment Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env.local` and configure:

```bash
# AWS Profile (if using AWS CLI profiles)
AWS_PROFILE=your-aws-profile-name

# IAM Identity Center region (typically doesn't change)
NEXT_PUBLIC_AWS_SSO_REGION=us-east-1

# Default AWS region (can be changed in UI)
NEXT_PUBLIC_AWS_DEFAULT_REGION=us-east-1
```

**Important Notes:**
- `NEXT_PUBLIC_AWS_SSO_REGION`: Set this to the region where your IAM Identity Center is configured. This is typically set once and doesn't change.
- `NEXT_PUBLIC_AWS_DEFAULT_REGION`: The default AWS region for operations. Users can override this in the UI.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 AWS Setup

### For Single Account View

Your AWS user/role needs these permissions:

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
        "iam:ListGroupsForUser",
        "iam:GetGroup",
        "iam:ListAttachedGroupPolicies",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

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
│   │   ├── users/route.ts            # List all IAM users
│   │   ├── users/[username]/route.ts # Get user permissions
│   │   └── organization/
│   │       ├── accounts/route.ts     # List organization accounts
│   │       └── users/route.ts        # Get organization-wide user access
│   └── page.tsx                      # Main dashboard page
├── components/
│   ├── UserList.tsx                  # Single account user listing
│   ├── PermissionView.tsx            # Permission display component
│   └── OrganizationUserList.tsx      # Organization-wide user view
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
