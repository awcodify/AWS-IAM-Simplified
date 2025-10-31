# AWS IAM Simplified - Features Documentation

This document provides a comprehensive overview of all features available in AWS IAM Simplified.

## Table of Contents
- [Account Type Support](#account-type-support)
- [Management Account Features](#management-account-features)
- [Local IAM Account Features](#local-iam-account-features)
- [SSO-Enabled Account Features](#sso-enabled-account-features)
- [Shared Features](#shared-features)
- [Technical Features](#technical-features)

---

## Account Type Support

The application automatically detects your AWS account type and displays appropriate indicators on the dashboard.

### Supported Account Types

1. **Management Account** - AWS Organizations management account
2. **Local IAM Account** - Any AWS account with IAM users
3. **SSO-Enabled Account** - Account with IAM Identity Center configured

You can use different accounts for different features by switching AWS profiles or credentials.

---

## Management Account Features

**Route:** `/accounts/management`  
**Requirements:** AWS Organizations Management Account

### Organization-Wide User Management

#### User Listing
- View all users from IAM Identity Center (AWS SSO)
- Fallback to IAM users if Identity Center not configured
- Paginated user list (configurable page size)
- Search functionality for finding specific users
- Real-time user count display

#### User Details
- User ID and username
- Email address (when available)
- Account access information
- Permission assignments

#### Account Overview
- List all accounts in your AWS Organization
- Account ID, name, and status
- Total account count
- Account filtering and search

#### Cross-Account Access Verification
- **Optional feature** requiring cross-account roles
- See which accounts each user has access to
- Bulk access loading for performance
- Visual indicators for access status
- Load access for all users at once or on-demand

#### Performance Optimizations
- Bulk access loading API
- Caching of organization accounts
- Efficient pagination
- Debounced search

### Account Capability Detection
- Automatic detection of management account access
- Real-time verification of Organizations API access
- Visual indicators on dashboard
- Error handling for permission issues

---

## Local IAM Account Features

**Route:** `/accounts/iam`  
**Requirements:** Any AWS Account

### IAM User Management

#### User Listing
- View all IAM users in the current account
- User metadata (creation date, ARN, etc.)
- Account ID display
- Total user count
- Search and filter users

#### Detailed Permission Analysis
- Click any user to see their permissions
- Three types of policy analysis:
  1. **Managed Policies** - AWS and customer-managed policies
  2. **Inline Policies** - Policies embedded directly in the user
  3. **Group Memberships** - Groups the user belongs to

#### Policy Viewing
- Expandable/collapsible policy documents
- JSON syntax highlighting
- Policy names and ARNs
- Attached vs inline policy indicators
- Group-inherited permissions

#### Policy Details
- View full policy JSON documents
- Collapsible policy sections
- Easy navigation through multiple policies
- Clear visual hierarchy

### User Information Display
- Username and User ID
- ARN (Amazon Resource Name)
- Creation date
- Path information
- Tags (if available)

---

## SSO-Enabled Account Features

**Requirements:** IAM Identity Center (AWS SSO) Enabled

### Permission Sets (`/permission-sets`)

#### Permission Set Listing
- View all permission sets in your Identity Center
- Permission set names and ARNs
- Description and metadata
- Total count display
- Real-time data from AWS

#### Permission Set Details
- Detailed view of each permission set
- Inline policies (if configured)
- AWS managed policies attached
- Customer managed policies attached
- Permission boundaries (if set)
- Session duration settings

#### Policy Analysis
- View permission set policies
- Multiple policy types:
  - Inline policies
  - AWS managed policies
  - Customer managed policies
- Policy ARNs and names
- Easy navigation

### Risk Analysis (`/risk-analysis`)

#### Real-Time Risk Assessment
- Streaming analysis with live progress updates
- Analyze all permission sets for security risks
- Real-time results as they're calculated
- Session-based scanning

#### Risk Metrics
- **Overall Risk Score** - Aggregated risk across all users
- **Critical Users** - Users with critical risk level (score > 80)
- **High Risk Users** - Users with high risk (score 60-80)
- **Admin Users** - Users with administrative permissions
- **Cross-Account Users** - Users with multi-account access
- **Average Risk Score** - Mean risk across all users

#### Risk Categories

**Permission Risk (40% weight)**
- Identifies overly broad permissions
- Detects wildcards in actions and resources
- Flags dangerous service combinations
- Scores based on permission scope

**Admin Access Detection (35% weight)**
- Identifies full administrator access
- Detects elevated privileges
- Flags root-equivalent permissions
- Security-sensitive service access

**Resource Scope Risk (25% weight)**
- Evaluates resource restrictions
- Detects resource wildcards
- Identifies unrestricted access
- Conditional access verification

#### Risk Levels
- 🔴 **Critical** (81-100): Immediate attention required
- 🟠 **High** (61-80): Review recommended
- 🟡 **Medium** (41-60): Monitor
- 🟢 **Low** (0-40): Acceptable risk

#### Streaming Progress
- Real-time progress bar
- Current step indicator
- Permission sets processed count
- Estimated completion
- User-friendly status messages

#### Session Management
- Scans persist across navigation
- Resume ongoing scans when returning to page
- Automatic session expiry (1 hour)
- No duplicate scans with same parameters
- Session restoration after page reload

#### Risk Dashboard
- Visual risk score display
- User risk profiles
- Sortable risk table
- Filter by risk level
- Export capabilities (future)

---

## Shared Features

Available across all pages and account types.

### Settings Page (`/settings`)

#### Region Configuration
- **AWS Operations Region** - For IAM and Organizations operations
- **Identity Center Region** - For SSO/Identity Center operations
- Independent region selection
- 21 AWS regions available
- Persistent configuration (localStorage)
- Visual region selector

#### Region Settings
- Change regions without restarting
- Automatic API updates on region change
- Validation of Identity Center region
- Clear region indicators in UI

### Account Information Display
- Current AWS account ID
- Account alias (if configured)
- Account type indicators
- Real-time account info
- Displayed in header on all pages

### Authentication
- Login page with credential entry
- Secure credential storage (localStorage)
- Session management
- AuthGuard protection on all pages
- Automatic redirect to login

### Navigation
- Clean, modern header navigation
- Breadcrumb navigation
- Quick links to all features
- Active page indicators
- Mobile-responsive menu

### Dashboard (`/`)
- Central navigation hub
- Feature cards for each section
- Account capability indicators
- Quick metrics:
  - Total users
  - Total permission sets
  - Total accounts
- Direct links to all features
- Visual status indicators

---

## Technical Features

### Performance Optimizations

#### Caching System
- **`useAccountInfo`** - 5-minute TTL cache
- **`usePermissionSets`** - Region-based caching
- **`useOrganizationAccounts`** - Region-based caching
- Automatic cache invalidation
- Promise deduplication
- Prevents duplicate API calls

#### Bulk Loading
- Bulk user access loading
- Batch API requests
- Optimized for large datasets
- Reduced API throttling risk

#### Streaming Data
- Real-time risk analysis streaming
- Server-Sent Events (SSE)
- Progressive results display
- Non-blocking UI

### Error Handling

#### User-Friendly Errors
- Clear error messages
- Actionable troubleshooting steps
- Permission-specific guidance
- Region-specific errors

#### Graceful Degradation
- Features degrade gracefully
- Fallback options when available
- Clear capability indicators
- No silent failures

### Data Management

#### State Management
- React Context for auth and region
- Custom hooks for data fetching
- Local state for UI interactions
- Session storage for scan sessions

#### Type Safety
- Full TypeScript implementation
- Comprehensive type definitions
- AWS SDK type integration
- Compile-time type checking

### UI/UX Features

#### Modern Interface
- Clean, professional design
- Tailwind CSS styling
- Responsive layout
- Mobile-friendly

#### Visual Indicators
- Account type badges
- Capability indicators
- Loading states
- Progress indicators
- Status badges

#### Interactive Elements
- Expandable sections
- Collapsible cards
- Sortable tables
- Searchable lists
- Filterable data

#### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support

---

## Feature Matrix

| Feature | Management Account | Local IAM | SSO-Enabled |
|---------|-------------------|-----------|-------------|
| Organization Users | ✅ | ❌ | ❌ |
| Organization Accounts | ✅ | ❌ | ❌ |
| Cross-Account Access | ✅ (optional) | ❌ | ❌ |
| Local IAM Users | ❌ | ✅ | ❌ |
| IAM Permission Details | ❌ | ✅ | ❌ |
| Permission Sets | ❌ | ❌ | ✅ |
| Risk Analysis | ❌ | ❌ | ✅ |
| Settings | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |

---

## Coming Soon

Features planned for future releases:

- Export risk analysis results
- Risk trend tracking over time
- Custom risk scoring rules
- Email alerts for critical risks
- Compliance reporting
- Multi-region aggregation
- CloudTrail integration
- Cost analysis per user
- Permission recommendation engine

---

## Feature Requests

Have an idea for a new feature? Please open an issue on GitHub with the "feature request" label.

## Documentation

- [README.md](./README.md) - Getting started guide
- [ACCOUNT_REQUIREMENTS.md](./ACCOUNT_REQUIREMENTS.md) - Account setup details
- [ORGANIZATION_SETUP.md](./ORGANIZATION_SETUP.md) - Cross-account setup
- [API_OPTIMIZATION_ANALYSIS.md](./API_OPTIMIZATION_ANALYSIS.md) - Performance optimizations
- [RISK_ANALYSIS_OPTIMIZATION.md](./RISK_ANALYSIS_OPTIMIZATION.md) - Risk analysis details
- [SCAN_SESSION_SOLUTION.md](./SCAN_SESSION_SOLUTION.md) - Scan session management
