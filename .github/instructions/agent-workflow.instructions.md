---
description: Step-by-step workflow for AI agents making changes to the codebase
applyTo: "**"
---

# AI Agent Workflow Guide
**Clear Instructions for Maintaining AWS IAM Simplified**

Last Updated: October 31, 2025

---

## 🎯 Mission Statement

**You are the maintenance agent for AWS IAM Simplified.** Your job is to:

1. 📖 **Understand before acting** - Read context files first
2. 💻 **Write clean, type-safe code** - Follow established patterns
3. 📝 **Document everything** - Update docs for every change
4. 🔍 **Maintain quality** - Keep code quality score at 82/100 or higher
5. 🎯 **Track progress** - Update analysis after significant changes

---

## 📚 Required Reading (In Order)

### Before Making ANY Changes

**Step 1:** Read `.github/instructions/project-analysis.instructions.md`
- Current project status
- Known issues and technical debt
- Architecture overview
- Performance metrics

**Step 2:** Read `.github/copilot-instructions.md`
- Code style guidelines
- Technical requirements
- Patterns to follow
- Common pitfalls

**Step 3:** Read relevant documentation in `/docs/`
- Feature docs for context
- Technical docs for implementation details

---

## 🔄 Standard Workflow for Changes

### Phase 1: Understanding (Required)

```
┌─────────────────────────────────┐
│  1. Read user request           │
│  2. Check project-analysis.instructions.md   │
│  3. Review related code files   │
│  4. Check existing patterns     │
│  5. Identify documentation needs│
└─────────────────────────────────┘
```

**Questions to ask yourself:**
- What files will be affected?
- What documentation needs updating?
- Does this introduce technical debt?
- Are there existing utilities I can use?
- Does this follow the Result pattern?

### Phase 2: Implementation

```
┌─────────────────────────────────┐
│  1. Write code following        │
│     TypeScript guidelines       │
│  2. Use Result pattern for      │
│     error handling              │
│  3. Add JSDoc comments          │
│  4. Keep functions small        │
│  5. Extract constants           │
└─────────────────────────────────┘
```

**Code Quality Checklist:**
- [ ] No `any` type used
- [ ] Functions < 50 lines (ideal)
- [ ] Constants extracted (no magic numbers)
- [ ] JSDoc comments for public APIs
- [ ] Result pattern for AWS operations
- [ ] Caching hooks used for API calls
- [ ] No console.log() for debugging
- [ ] Error messages are user-friendly

### Phase 3: Documentation (Mandatory)

```
┌─────────────────────────────────┐
│  1. Update inline JSDoc         │
│  2. Update /docs/ files         │
│  3. Update README if needed     │
│  4. Add CHANGELOG entry         │
│  5. Update PROJECT-ANALYSIS     │
│     if significant              │
└─────────────────────────────────┘
```

**Documentation Update Matrix:**

| Change Type | Update These Docs |
|-------------|-------------------|
| **New Feature** | `README.md`, `/docs/features.md`, `CHANGELOG.md` |
| **API Change** | `/docs/technical/`, inline JSDoc, `CHANGELOG.md` |
| **Architecture Change** | `project-analysis.instructions.md`, relevant tech docs |
| **Bug Fix** | `CHANGELOG.md`, affected feature docs |
| **Configuration** | `README.md`, `.env.example`, setup docs |
| **Performance** | `project-analysis.instructions.md`, `/docs/technical/` |
| **Refactoring** | `project-analysis.instructions.md` (update metrics) |

### Phase 4: Verification

```
┌─────────────────────────────────┐
│  1. Review all changes          │
│  2. Check documentation updated │
│  3. Verify no regressions       │
│  4. Confirm type safety         │
│  5. Test in development         │
└─────────────────────────────────┘
```

**Final Checklist:**
- [ ] All code changes complete
- [ ] All documentation updated
- [ ] No TypeScript errors
- [ ] No lint errors (except markdown lint)
- [ ] No console.log() statements
- [ ] No TODO comments (create issues instead)

---

## 📋 Change Type Templates

### Adding a New Feature

**Steps:**
1. Implement feature following existing patterns
2. Update `/docs/features.md` with new feature
3. Update `README.md` if user-facing
4. Add entry to `/docs/CHANGELOG.md`
5. Update `project-analysis.instructions.md` metrics if significant

**Example:**
```markdown
## CHANGELOG.md
### Added - [Date]
- New bulk permission analysis feature
  - Analyzes multiple users simultaneously
  - Displays aggregate risk scores
  - See `/docs/features.md#bulk-analysis`
```

### Fixing a Bug

**Steps:**
1. Fix the bug using Result pattern
2. Add JSDoc explaining the fix
3. Update affected feature documentation
4. Add entry to `/docs/CHANGELOG.md`
5. Update `project-analysis.instructions.md` if it resolves technical debt

**Example:**
```markdown
## CHANGELOG.md
### Fixed - [Date]
- Corrected permission set caching issue
  - Cache now properly invalidates on region change
  - Fixes issue where stale data was displayed
```

### Refactoring Code

**Steps:**
1. Refactor following established patterns
2. Ensure no behavior changes
3. Update JSDoc if function signatures change
4. Update `project-analysis.instructions.md` metrics
5. Add entry to `/docs/CHANGELOG.md`

**Example:**
```markdown
## CHANGELOG.md
### Refactored - [Date]
- Extracted policy parsing to shared utility
  - Reduced code duplication from 3 to 1 location
  - Improved maintainability score

## project-analysis.instructions.md
### Code Quality Analysis
- Code duplication: ~~3 instances~~ → 1 centralized utility ✅
```

### Updating Dependencies

**Steps:**
1. Update dependencies
2. Test for breaking changes
3. Update `README.md` if setup changes
4. Add entry to `/docs/CHANGELOG.md`
5. Update `project-analysis.instructions.md` if AWS SDK versions change

---

## 🎯 Decision Trees

### Should I update project-analysis.instructions.md?

```
Does this change affect:
├─ Architecture?          → YES, update Architecture section
├─ Technical debt?        → YES, update Issues & Technical Debt
├─ Performance?           → YES, update Performance Analysis
├─ Dependencies (major)?  → YES, update Tech Stack section
├─ Code metrics?          → YES, update Code Metrics
└─ None of above?         → NO, just update CHANGELOG
```

### Which error handling pattern should I use?

```
What type of operation?
├─ AWS SDK call?          → Use Result pattern (safeAsync)
├─ Sync operation?        → Use Result pattern (safeSyncOperation)
├─ React component?       → Use try-catch (existing pattern)
├─ Auth flow?             → Use try-catch (existing pattern)
└─ API route?             → Use Result pattern
```

### Should I create a new utility function?

```
Is this logic:
├─ Used in 2+ places?     → YES, extract to utility
├─ Complex (>20 lines)?   → YES, extract to utility
├─ Reusable concept?      → YES, extract to utility
├─ Single use + simple?   → NO, keep inline
└─ Already exists?        → NO, use existing!
```

---

## 🚨 Critical Rules (Never Break These)

### 1. Documentation Rule
**❌ NEVER commit code without updating documentation**

Every code change MUST have corresponding documentation updates. No exceptions.

### 2. Type Safety Rule
**❌ NEVER use `any` type**

We have 0 usage of `any`. This must be maintained.

```typescript
// ❌ WRONG
const data: any = await fetch(...);

// ✅ CORRECT
interface ApiResponse {
  data: UserData[];
}
const data: ApiResponse = await fetch(...);
```

### 3. Error Handling Rule
**❌ NEVER use try-catch for AWS SDK operations**

Use the Result pattern instead.

```typescript
// ❌ WRONG
try {
  const result = await client.send(command);
} catch (error) {
  // ...
}

// ✅ CORRECT
const result = await safeAsync(client.send(command));
if (!result.success) {
  // Handle error
}
```

### 4. Caching Rule
**❌ NEVER fetch API data directly in components**

Always use caching hooks.

```typescript
// ❌ WRONG
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/account').then(/* ... */);
}, []);

// ✅ CORRECT
const { accountInfo, loading } = useAccountInfo();
```

### 5. Function Size Rule
**⚠️ AVOID functions larger than 50 lines**

Split large functions into smaller, focused functions.

```typescript
// ❌ AVOID
function analyzeUser() {
  // 150 lines of code
}

// ✅ BETTER
function analyzeUser() {
  const policies = analyzeUserPolicies();
  const groups = analyzeUserGroups();
  const risks = calculateRiskScore(policies, groups);
  return combineAnalysis(policies, groups, risks);
}
```

---

## 📊 Quality Gates

### Before Marking Work as Complete

**All must be TRUE:**
- ✅ Code follows TypeScript guidelines (no `any`)
- ✅ Error handling uses Result pattern
- ✅ Functions are small and focused
- ✅ Constants extracted (no magic numbers)
- ✅ JSDoc comments added
- ✅ All relevant documentation updated
- ✅ CHANGELOG.md entry added
- ✅ No console.log() for debugging
- ✅ No TODO comments in code
- ✅ No TypeScript errors
- ✅ Code tested in development

**If ANY are FALSE, work is not complete.**

---

## 🔍 Common Scenarios

### Scenario 1: Adding a New API Endpoint

```
1. Create API route in /src/app/api/
2. Use modular AWS services
3. Extract credentials from headers
4. Use Result pattern for AWS calls
5. Return proper JSON responses
6. Add JSDoc comments
7. Update /docs/technical/ if complex
8. Add CHANGELOG entry
```

**Example:**
```typescript
/**
 * GET /api/users/:userId/permissions
 * Fetches detailed permissions for a specific user
 * 
 * @returns UserPermissions object with attached policies and groups
 */
export async function GET(request: Request) {
  const credentials = extractCredentialsFromHeaders(request);
  const userService = new UserService(region, credentials);
  
  const result = await userService.getUserPermissions(userName);
  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, data: result.data });
}
```

### Scenario 2: Fixing a Performance Issue

```
1. Identify the bottleneck
2. Implement optimization (caching, bulk ops, etc.)
3. Measure improvement
4. Update project-analysis.instructions.md Performance section
5. Document optimization in /docs/technical/
6. Add CHANGELOG entry
```

### Scenario 3: Refactoring for Code Quality

```
1. Identify code smell (duplication, large function, etc.)
2. Refactor following patterns
3. Ensure no behavior changes
4. Update JSDoc if needed
5. Update project-analysis.instructions.md metrics
6. Add CHANGELOG entry
```

---

## 📈 Maintaining Project Health

### Weekly Maintenance Tasks

**For the AI agent:**
1. Review open issues/PRs
2. Check for dependency updates
3. Scan for new technical debt
4. Update project-analysis.instructions.md if needed

### After Major Changes

**When to add a new timeline entry to project-analysis.instructions.md:**

Trigger events:
- ✅ Completed Phase 1, 2, or 3 action items
- ✅ Code quality score changed by ±5 points
- ✅ Resolved major technical debt (duplicate files, large functions)
- ✅ Architectural changes (new service layer, pattern changes)
- ✅ Test coverage increased by >20%
- ✅ Quarterly review (every 3 months)

**How to update:**
1. Add new timeline entry at top of timeline section
2. Increment version number (1.0 → 1.1 or 2.0 for major changes)
3. Document what changed since last entry
4. Update metrics that improved/degraded
5. List any new technical debt discovered
6. Update action item priorities
7. Keep "Executive Summary" section current

**Update these sections:**
- 📅 **Analysis Timeline** - Add new entry (required)
- 📊 **Executive Summary** - Update current status
- 💎 **Code Quality Analysis** - Update score and metrics
- 🔧 **Issues & Technical Debt** - Remove resolved, add new
- 🎯 **Priority Action Items** - Update based on progress
- 📊 **Code Metrics** - Update the metrics table

**Example timeline entry:**
```markdown
### Version 1.1 - November 15, 2025
**Status:** 78% Production-Ready | Code Quality: 85/100

**What Changed:**
- ✅ Removed duplicate risk-analyzer.ts
- ✅ Created .env.example
- ✅ Extracted constants to constants/api.ts
- ✅ Implemented structured logging

**Metrics Improved:**
- Code Quality: 82 → 85
- Deployment Readiness: 75 → 78
- Console statements: 50+ → 12

**Remaining Issues:**
- ❌ Still no test coverage
- ⚠️ Large functions need splitting

**Next Focus:** Phase 2 - Add test coverage
```

### Keeping Documentation Fresh

**Monthly review:**
- [ ] Verify all docs are accurate
- [ ] Check for outdated screenshots
- [ ] Update version numbers
- [ ] Review and close completed items
- [ ] Update technical debt list

---

## 🎓 Learning from Past Patterns

### Good Patterns in This Codebase

✅ **Result Pattern for Error Handling**
```typescript
// Consistent error handling without try-catch
const result = await safeAsync(operation);
if (!result.success) return result;
// TypeScript knows result.data exists here
```

✅ **Caching Hooks**
```typescript
// Prevents duplicate API calls
const { data, loading, error, invalidate } = useAccountInfo();
```

✅ **Service Layer Architecture**
```typescript
// Clean separation of concerns
class UserService {
  async getUserPermissions(userName: string) {
    // All AWS logic encapsulated
  }
}
```

✅ **Type Guards**
```typescript
// Runtime type checking
function isValidPolicy(value: unknown): value is IAMPolicyDocument {
  return typeof value === 'object' && 'Statement' in value;
}
```

### Patterns to Avoid

❌ **Large Monolithic Functions**
- Current issue in `risk-analyzer.ts`
- Split into smaller functions

❌ **Code Duplication**
- Policy parsing repeated in 3 places
- Centralize in shared utility

❌ **Magic Numbers**
- `60 * 60 * 1000` scattered throughout
- Extract to constants

---

## 🎯 Success Metrics

### For the AI Agent

**Your success is measured by:**

1. **Documentation Coverage** → 100% of changes documented
2. **Type Safety** → 0 usage of `any` type
3. **Code Quality** → Maintain 82/100 or improve
4. **Pattern Consistency** → Follow established patterns
5. **Technical Debt** → Don't add more, reduce when possible

### For the Project

**Project health indicators:**

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Documentation | 90/100 | >85 | ✅ |
| Type Safety | 95/100 | >90 | ✅ |
| Code Quality | 82/100 | >80 | ✅ |
| Test Coverage | 0% | >70% | ❌ |
| Deployment Ready | 75/100 | >85 | ⚠️ |

---

## 🚀 Quick Reference Commands

### Finding Information

```bash
# Find all uses of a function
grep -r "functionName" src/

# Find all TODO comments
grep -r "TODO" src/

# Find all console.log statements
grep -r "console\.log" src/

# Find all any types
grep -r ": any" src/
```

### Common File Locations

```
📁 Code to modify:
  /src/lib/aws-services/    → AWS service layer
  /src/hooks/               → Custom React hooks
  /src/app/api/             → API routes
  /src/components/          → React components

📁 Documentation to update:
  /.github/instructions/project-analysis.instructions.md  → Project health
  /.github/copilot-instructions.md → AI agent rules
  /README.md                → Main documentation
  /docs/features.md         → Feature documentation
  /docs/CHANGELOG.md        → Change history

📁 Configuration:
  /src/constants/           → Application constants
  .env (create .env.example) → Environment config
```

---

## 🎯 Final Reminder

### Every Change You Make Should:

1. ✅ **Improve the codebase** - Don't add technical debt
2. ✅ **Follow patterns** - Consistency is key
3. ✅ **Be documented** - Future you will thank you
4. ✅ **Be type-safe** - No `any` type ever
5. ✅ **Be testable** - Small, focused functions

### When in Doubt:

1. 📖 **Read project-analysis.instructions.md** - Context is there
2. 🔍 **Look for existing patterns** - Don't reinvent
3. 📝 **Document your decision** - Explain why
4. 🤔 **Ask yourself:** "Will this confuse future developers?"

---

**Remember:** This is a high-quality codebase with 82/100 code quality. Your job is to maintain or improve that standard while ensuring complete documentation of all changes.

---

*Last Updated: October 31, 2025*  
*This workflow guide is for AI agents maintaining AWS IAM Simplified*
