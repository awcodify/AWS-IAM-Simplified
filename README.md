# AWS IAM Dashboard

A simplified web dashboard for AWS IAM management that helps you easily understand what resources a specific user can access in AWS accounts.

## 🎯 Purpose

Managing IAM in AWS can be stressful, especially when IAM wasn't set up properly from the beginning. This dashboard simplifies the process by providing a clear overview of all users and allowing you to easily explore their permissions:

**"What users exist in account Z and what resources does user X have access to?"**

## ✨ Features

- **User listing** - View all IAM users in your AWS account at a glance
- **Click to view permissions** - Select any user to see their detailed permissions
- **Comprehensive permission view** - Shows attached policies, inline policies, and group memberships
- **Account information** - Displays current AWS account details
- **Clean, modern UI** - Built with Next.js and Tailwind CSS
- **Real-time data** - Fetches live data from AWS IAM APIs

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
# Edit .env.local with your AWS credentials
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 AWS Setup

### Required IAM Permissions

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
│   │   └── users/[username]/route.ts # Get user permissions
│   └── page.tsx                      # Main dashboard page
├── components/
│   ├── UserList.tsx                  # User listing component
│   └── PermissionView.tsx            # Permission display component
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
