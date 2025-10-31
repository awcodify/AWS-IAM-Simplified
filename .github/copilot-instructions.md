---
description: Main technical guidelines, coding standards, and architectural patterns for AWS IAM Simplified
---

# 🧠 AWS IAM Simplified - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## 📋 Essential Reading (Start Here!)

**Before making ANY changes, read these in order:**

1. 🔄 [Agent Workflow](./instructions/agent-workflow.instructions.md)
   - Step-by-step workflow for proposing, analyzing, and refactoring changes
   - Contains decision trees, quality gates, and change templates
   - **Read this first to understand HOW to make changes**

2. 📊 [Project Analysis](./instructions/project-analysis.instructions.md)
   - Full project health report with code quality metrics (82/100)
   - Technical debt tracking and timeline
   - Known issues and improvement priorities
   - **Read this to understand WHAT needs improvement**

3. 📚 This file (copilot-instructions.md)
   - Technical guidelines and coding standards
   - Architectural patterns and best practices
   - Type safety and error handling rules
   - **Read this to understand HOW TO CODE**

## 📋 Project Context

**Project Health:** 75% Production-Ready | Code Quality: 82/100 | No Tests (0%)

This is a Next.js TypeScript project for simplifying AWS IAM management across multiple account types (Management, Local IAM, SSO-enabled). The main goal is to help users easily understand what resources and permissions exist across AWS accounts in an organization.

**Project Status:** 75% Production-Ready | Code Quality: 82/100 | No Tests (0%)

---

## 🎯 Core Principles

### 1. Keep Everything Simple
- No overengineering
- Prefer simple, readable code over clever solutions
- When in doubt, choose clarity over cleverness

### 2. Documentation is Mandatory
**⚠️ CRITICAL RULE: Every code change MUST include documentation updates**

When you make ANY change to code, you MUST:
1. ✅ Update relevant documentation in `/docs/` if behavior changes
2. ✅ Update inline JSDoc comments if function signatures change
3. ✅ Update `project-analysis.instructions.md` if architecture or technical debt changes
4. ✅ Update `README.md` if user-facing features change
5. ✅ Add entry to `/docs/CHANGELOG.md` for significant changes

**Documentation locations by change type:**
- API changes → `/docs/technical/` or inline JSDoc
- Feature changes → `/docs/features.md` + `README.md`
- Architecture changes → `project-analysis.instructions.md`
- Setup changes → `README.md` + relevant docs
- Bug fixes → `/docs/CHANGELOG.md`

### 3. Type Safety is Non-Negotiable
- **NEVER use `any` type** - We have 0 usage and must maintain it
- Always define proper TypeScript interfaces
- Use type guards for runtime type checking
- Leverage TypeScript's type inference

### 4. Error Handling Pattern
- **Prefer Result Pattern** over try-catch for AWS operations
- Use `safeAsync()` for async operations that return `Result<T, Error>`
- Use `safeSyncOperation()` for sync operations
- Only use try-catch in React contexts or auth flows (existing pattern)

### 5. Performance First
- Always use caching hooks for API calls
- Prevent duplicate API requests
- Implement proper loading states
- Use bulk operations where possible

---

## 🛠️ Tech Stack

### Core Framework
- **Next.js 15** with App Router (React Server Components + Client Components)
- **React 19.1.0** (functional components with hooks)
- **TypeScript 5** (strict mode)
- **Tailwind CSS 4** for styling

### AWS Integration
- **AWS SDK v3** (modern, tree-shakeable):
  - `@aws-sdk/client-iam` v3.864.0
  - `@aws-sdk/client-identitystore` v3.864.0
  - `@aws-sdk/client-organizations` v3.864.0
  - `@aws-sdk/client-sso-admin` v3.865.0
  - `@aws-sdk/client-sts` v3.864.0
  - `@aws-sdk/credential-providers` v3.864.0

### State Management
- **React Context API** for global state (Auth, Region)
- **Custom hooks with caching** for API data
- **localStorage** for credential persistence
- **sessionStorage** for scan session management

---

## 📁 Project Structure

```
/src
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (server-side)
│   │   ├── account/             # Account info endpoint
│   │   ├── iam/users/           # IAM user endpoints
│   │   ├── organization/        # Org & SSO user endpoints
│   │   ├── permission-sets/     # Permission set endpoints
│   │   └── risk-analysis/       # Risk analysis endpoints
│   ├── accounts/                # Account-type-specific pages
│   │   ├── iam/                # Local IAM users page
│   │   ├── identity-center/    # Identity Center page
│   │   └── management/         # Management account page
│   ├── auth/login/              # Login page
│   ├── permission-sets/         # Permission sets list
│   ├── risk-analysis/           # Risk analysis page
│   └── settings/                # Settings page
├── components/                   # Reusable React components
│   ├── ui/                      # Base UI components
│   └── user-access/             # User access components
├── contexts/                     # React contexts
│   ├── AuthContext.tsx          # Authentication state
│   └── RegionContext.tsx        # AWS region management
├── hooks/                        # Custom React hooks (with caching!)
│   ├── useAccountInfo.ts        # Account info (5min TTL cache)
│   ├── usePermissionSets.ts     # Permission sets (cached)
│   ├── useOrganizationAccounts.ts # Org accounts (cached)
│   ├── useIAMUsers.ts           # IAM users
│   └── useStreamingRiskAnalysis.ts # Risk analysis streaming
├── lib/                          # Utility functions and services
│   ├── aws-services/            # ⭐ Modular AWS service layer
│   │   ├── account-service.ts   # STS & account operations
│   │   ├── user-service.ts      # IAM & Identity Center users
│   │   ├── sso-service.ts       # SSO Admin operations
│   │   ├── organization-service.ts # AWS Organizations
│   │   └── index.ts             # Main AWSService orchestrator
│   ├── risk-analyzers/          # Risk analysis modules
│   │   ├── policy-analyzer.ts   # Policy risk analysis
│   │   ├── risk-calculator.ts   # Risk scoring
│   │   └── index.ts             # Main analyzer
│   ├── utils/                   # Shared utilities
│   ├── auth-service.ts          # Authentication logic
│   ├── credentials.ts           # Credential management
│   ├── result.ts                # Result pattern utilities
│   ├── optional.ts              # Optional monad
│   └── scan-session-manager.ts  # Session persistence
├── types/                        # TypeScript type definitions
│   ├── aws.ts                   # AWS-related types
│   ├── auth.ts                  # Auth types
│   └── risk-analysis.ts         # Risk analysis types
└── constants/                    # Application constants
    └── regions.ts               # AWS regions list

/docs                             # 📚 Documentation (keep updated!)
├── README.md                     # Documentation hub
├── features.md                   # Complete feature documentation
├── account-requirements.md       # Account type guide
├── setup-cross-account.md        # Cross-account setup
├── CHANGELOG.md                  # Documentation changelog
└── technical/                    # Technical implementation docs
    ├── api-optimization.md       # Caching strategy
    ├── risk-analysis-optimization.md
    └── scan-session-management.md

/.github
├── copilot-instructions.md       # This file (main guidelines)
├── instructions/                 # Path-specific instruction files
│   ├── agent-workflow.instructions.md    # Workflow guide
│   └── project-analysis.instructions.md  # Project health report
└── README.md                     # System documentation
```

---

## 💻 Code Style Guidelines

### TypeScript Rules

✅ **DO:**
```typescript
// Use proper interfaces
interface UserPermissions {
  user: IAMUser;
  attachedPolicies: AttachedPolicy[];
}

// Use Result pattern for errors
const result = await safeAsync(client.send(command));
if (!result.success) {
  return { error: result.error };
}

// Use type guards
function isValidPolicy(value: unknown): value is IAMPolicyDocument {
  return typeof value === 'object' && value !== null && 'Statement' in value;
}

// Extract constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

❌ **DON'T:**
```typescript
// NEVER use any
const data: any = await fetch(...);

// Don't use try-catch for AWS operations (use Result pattern)
try {
  const result = await iamClient.send(command);
} catch (error) {
  // Use safeAsync() instead
}

// Don't hardcode magic numbers
setTimeout(() => {}, 300000); // What is this?

// Don't use unsafe type assertions
const doc = JSON.parse(str) as IAMPolicyDocument; // Unsafe!
```

### React Component Guidelines

✅ **DO:**
```typescript
// Use functional components with TypeScript
interface Props {
  userName: string;
  permissions: UserPermissions;
}

export default function UserCard({ userName, permissions }: Props) {
  const { region } = useRegion();
  const { data, loading } = useAccountInfo(); // Use caching hooks
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div>
      {/* Keep components focused and small */}
    </div>
  );
}
```

❌ **DON'T:**
```typescript
// Don't create 500+ line components
// Don't fetch data directly in components (use hooks)
// Don't put business logic in components
```

### File Organization

✅ **DO:**
- Keep files under 250 lines (target: 150-200)
- One component per file
- Co-locate related types with implementation
- Use barrel exports (`index.ts`) for clean imports

❌ **DON'T:**
- Create monolithic files (max 500 lines)
- Mix multiple concerns in one file
- Create circular dependencies

---

## 🔐 AWS Integration Patterns

### Service Layer Usage

```typescript
// In API routes, use modular services
import { AccountService, UserService } from '@/lib/aws-services';

const credentials = extractCredentialsFromHeaders(request);
const accountService = new AccountService(region, credentials);
const userService = new UserService(region, credentials);

const accountResult = await accountService.getAccountInfo();
if (!accountResult.success) {
  return NextResponse.json({ error: accountResult.error.message }, { status: 500 });
}
```

### Credential Handling

```typescript
// Client-side: Use AuthContext
const { session } = useAuth();
const headers = createAuthHeaders();

// Server-side: Extract from headers
const credentials = extractCredentialsFromHeaders(request);
```

### Error Handling

```typescript
// Use Result pattern for AWS operations
const result = await safeAsync(client.send(command));

if (!result.success) {
  console.error('Operation failed:', result.error);
  return { success: false, error: result.error.message };
}

return { success: true, data: result.data };
```

### Caching Strategy

```typescript
// Always use caching hooks in components
const { accountInfo, loading, error } = useAccountInfo(); // Has 5min TTL cache
const { permissionSets } = usePermissionSets(awsRegion, ssoRegion); // Cached
const { accounts } = useOrganizationAccounts(); // Cached

// Don't fetch directly in components
// ❌ const response = await fetch('/api/account');
```

---

## 🧪 Testing Guidelines (Future)

**Current Status:** No tests exist (0% coverage)

**When test suite is added:**
- Write tests for all new features
- Test error paths, not just happy paths
- Mock AWS SDK responses
- Use React Testing Library for components
- Aim for >70% coverage

---

## 📝 Documentation Requirements

### When to Update Documentation

**ALWAYS update documentation when you:**
1. Add a new feature
2. Modify existing functionality
3. Change API endpoints
4. Update component props
5. Refactor architecture
6. Fix bugs that affect behavior
7. Change configuration options
8. Update dependencies significantly

### Documentation Checklist

Before marking any task as complete, ensure:

- [ ] Code changes are implemented
- [ ] Inline JSDoc comments added/updated
- [ ] Relevant `/docs/*.md` files updated
- [ ] `README.md` updated if user-facing
- [ ] `project-analysis.instructions.md` updated if architecture changed
- [ ] `/docs/CHANGELOG.md` entry added
- [ ] Type definitions updated
- [ ] No TODO comments left in code (create GitHub issues instead)

### Documentation Style

```markdown
<!-- Use clear, actionable headings -->
## How to Configure SSO Region

<!-- Include code examples -->
```typescript
const { setSSORegion } = useRegion();
setSSORegion('us-east-1');
```

<!-- Explain why, not just what -->
> **Why?** Identity Center is regional and must be configured separately.

<!-- Link to related docs -->
See also: [Account Requirements](./account-requirements.md)
```

---

## 🚀 Development Workflow

### Making Changes

1. **Understand the context**
   - Read `project-analysis.instructions.md` for current state
   - Check existing patterns in similar files
   - Review relevant documentation

2. **Write the code**
   - Follow type safety rules (no `any`)
   - Use Result pattern for error handling
   - Keep functions small (<50 lines ideal)
   - Add JSDoc comments for public APIs

3. **Update documentation**
   - Update all relevant docs (see checklist above)
   - Add CHANGELOG entry if significant
   - Update project-analysis.instructions.md if needed

4. **Review before committing**
   - No console.log() for debugging (use console.error/warn only)
   - No hard-coded values (extract to constants)
   - No TODO comments (create issues instead)
   - All TypeScript errors resolved

### Git Commit Guidelines

```bash
# Use conventional commits
feat: add permission set filtering
fix: correct risk score calculation
docs: update API optimization guide
refactor: extract policy parsing utility
chore: update dependencies
```

---

## 🎯 Current Focus Areas

### High Priority (Do These First)

1. **Always update documentation** - Non-negotiable for every change
2. **Maintain type safety** - Never use `any`
3. **Use existing patterns** - Follow Result pattern, caching hooks
4. **Keep functions small** - Extract if over 50 lines
5. **Remove debug logs** - Only warn/error in production

### Technical Debt to Avoid Adding

❌ Don't add more:
- Large functions (>100 lines)
- Hard-coded values
- Code duplication
- Console.log() statements
- Try-catch blocks for AWS operations (use Result pattern)

✅ When possible, fix existing:
- Extract constants from magic numbers
- Split large functions
- Centralize duplicated logic
- Add JSDoc comments

---

## 🎨 UI/UX Guidelines

### Component Patterns

```typescript
// Use loading states
if (loading) return <LoadingSpinner />;

// Show errors gracefully
if (error) return <ErrorDisplay message={error} />;

// Provide empty states
if (data.length === 0) return <EmptyState />;

// Show success states
return <DataDisplay data={data} />;
```

### Accessibility
- Use semantic HTML
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Provide loading indicators

---

## 🔍 Debugging Guidelines

### Logging

```typescript
// Use structured logging (future: proper logger)
console.error('Failed to fetch user:', { userId, error });
console.warn('Rate limit approaching:', { remaining, limit });

// Don't use console.log for debugging
// ❌ console.log('here', data);
```

### Error Messages

```typescript
// User-facing errors should be helpful
return {
  error: 'Access denied. You may not have permissions to access AWS Organizations. Ensure you are using Management Account credentials.'
};

// Not helpful:
// ❌ return { error: 'Error' };
```

---

## 📊 Performance Guidelines

### Caching Rules

1. **Always use caching hooks** for API data
2. **Cache TTL**: 5 minutes for account info, no TTL for others
3. **Invalidate cache** when data mutations occur
4. **Deduplicate concurrent requests** using promise cache

### API Optimization

- Use bulk operations for multiple items
- Implement pagination for large lists (future)
- Use streaming for long-running operations (risk analysis)
- Batch similar requests when possible

---

## 🏗️ Architecture Decisions

### Service Layer Pattern

**Why?** Clean separation of AWS SDK logic from application logic

```typescript
// Good: Business logic in service
class UserService {
  async getUserPermissions(userName: string): Promise<UserPermissions> {
    // Complex AWS SDK calls
  }
}

// Bad: AWS SDK calls in components or API routes
```

### Result Pattern

**Why?** Functional error handling without try-catch exceptions

```typescript
// Forces explicit error handling
const result = await safeAsync(operation);
if (!result.success) {
  // Must handle error
  return result;
}
// TypeScript knows result.data exists here
```

### Caching Strategy

**Why?** AWS APIs are rate-limited and slow

- Prevents duplicate requests
- Improves user experience
- Reduces AWS costs
- Documented in `/docs/technical/api-optimization.md`

---

## 🎓 Learning Resources

**For understanding this codebase:**
1. Read `project-analysis.instructions.md` - Current state and issues
2. Read `/docs/features.md` - What the app does
3. Read `/docs/account-requirements.md` - AWS account types
4. Review `/src/lib/aws-services/` - Service architecture
5. Study `/src/lib/result.ts` - Error handling pattern

**For AWS concepts:**
- [AWS Organizations](https://docs.aws.amazon.com/organizations/)
- [AWS IAM Identity Center](https://docs.aws.amazon.com/singlesignon/)
- [AWS IAM](https://docs.aws.amazon.com/iam/)

---

## ⚠️ Common Pitfalls to Avoid

1. **Forgetting to update docs** - Always update docs!
2. **Using `any` type** - Never! We have 0 usage.
3. **Not using caching hooks** - Always use them for API calls
4. **Adding console.log** - Only use warn/error
5. **Hard-coding values** - Extract to constants
6. **Large functions** - Split into smaller functions
7. **Try-catch for AWS** - Use Result pattern instead
8. **Duplicate code** - Extract to utilities

---

## 📌 Quick Reference

### Most Used Imports

```typescript
// AWS Services
import { AWSService, AccountService, UserService } from '@/lib/aws-services';

// Error handling
import { safeAsync, safeSyncOperation, type Result } from '@/lib/result';

// Auth
import { useAuth } from '@/contexts/AuthContext';
import { createAuthHeaders } from '@/lib/credentials';

// Region
import { useRegion } from '@/contexts/RegionContext';

// Caching hooks
import { useAccountInfo } from '@/hooks/useAccountInfo';
import { usePermissionSets } from '@/hooks/usePermissionSets';
import { useOrganizationAccounts } from '@/hooks/useOrganizationAccounts';

// Types
import type { OrganizationUser, PermissionSetDetails, AccountInfo } from '@/types/aws';
```

### File Creation Template

```typescript
/**
 * [Brief description of what this file does]
 * 
 * @example
 * ```typescript
 * const result = await myFunction(params);
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */

import { /* imports */ } from '...';

// Types
interface MyInterface {
  // ...
}

// Implementation
export function myFunction(params: MyInterface): Result<Output, Error> {
  // ...
}
```

---

## 🎯 Success Criteria for AI Agents

**Your changes are successful when:**

✅ Code follows all TypeScript rules (no `any`, proper types)  
✅ Error handling uses Result pattern consistently  
✅ Functions are small and focused (<50 lines ideal)  
✅ All relevant documentation is updated  
✅ No console.log() for debugging  
✅ No hard-coded magic numbers  
✅ No code duplication introduced  
✅ Caching hooks used for all API calls  
✅ Changes are reflected in project-analysis.instructions.md if significant  
✅ CHANGELOG.md entry added for notable changes

---

## 🤖 Special Instructions for AI Agents

1. **Always read `project-analysis.instructions.md` first** - It contains complete project context
2. **Documentation is not optional** - Update docs for every change
3. **Ask before breaking patterns** - This project has established patterns
4. **Prioritize clarity** - Simple, readable code over clever solutions
5. **Check for existing utilities** - Don't recreate what exists
6. **Follow the Result pattern** - It's our error handling standard
7. **Maintain zero `any` usage** - This is a hard requirement
8. **Update analysis after major changes** - Keep project-analysis.instructions.md current

---

*Last Updated: October 31, 2025*  
*For project health status, see `.github/project-analysis.instructions.md`*
