# AWS IAM Simplified - Documentation

Welcome to the AWS IAM Simplified documentation! This folder contains all detailed documentation for the project.

## 📚 Documentation Structure

### Getting Started
- **[Main README](../README.md)** - Quick start guide and overview
- **[Features](./features.md)** - Complete feature documentation

### Setup & Configuration
- **[Account Requirements](./account-requirements.md)** - Which AWS account to use for each feature
- **[Cross-Account Setup](./setup-cross-account.md)** - Setting up cross-account access for management features

### Technical Documentation
Located in [`technical/`](./technical/) folder:
- **[API Optimization](./technical/api-optimization.md)** - Caching strategy and performance optimizations
- **[Risk Analysis Optimization](./technical/risk-analysis-optimization.md)** - Risk analysis implementation details
- **[Scan Session Management](./technical/scan-session-management.md)** - Session persistence for risk analysis

### Project History
- **[Changelog](./CHANGELOG.md)** - Documentation update history

---

## 🎯 Quick Links by Purpose

### For New Users
1. Start with the [Main README](../README.md)
2. Check [Account Requirements](./account-requirements.md) to understand which account to use
3. Review [Features](./features.md) to see what's available

### For Setup
1. [Account Requirements](./account-requirements.md) - Understand account types
2. [Cross-Account Setup](./setup-cross-account.md) - Optional cross-account configuration

### For Contributors
1. [Features](./features.md) - Understand all features
2. [Technical Documentation](./technical/) - Architecture and implementation details
3. [Changelog](./CHANGELOG.md) - Recent documentation updates

---

## 🏗️ Architecture Overview

The application supports three account types:

| Account Type | Features Available | Documentation |
|--------------|-------------------|---------------|
| **Management Account** | Organization users, accounts, cross-account access | [Account Requirements](./account-requirements.md) |
| **Local IAM Account** | Local IAM users and permissions | [Features - Local IAM](./features.md#local-iam-account-features) |
| **SSO-Enabled Account** | Permission sets, risk analysis | [Features - SSO Features](./features.md#sso-enabled-account-features) |

---

## 📖 Documentation Index

### User Documentation
- Account setup and requirements
- Feature guides and capabilities
- Troubleshooting common issues

### Technical Documentation
- API optimization strategies
- Caching implementation
- Risk analysis algorithms
- Session management

### Operational Documentation
- Cross-account role setup
- Permission configuration
- Region settings

---

## 🔗 External Resources

- [AWS Organizations Documentation](https://docs.aws.amazon.com/organizations/)
- [AWS IAM Identity Center Documentation](https://docs.aws.amazon.com/singlesignon/)
- [AWS IAM Documentation](https://docs.aws.amazon.com/iam/)

---

## 🤝 Contributing to Documentation

When updating documentation:

1. Keep the main README focused on quick start
2. Put detailed guides in this `docs/` folder
3. Technical implementation details go in `docs/technical/`
4. Update this README index when adding new docs
5. Keep cross-references up to date

---

## 📝 Documentation Conventions

- **File naming**: Use kebab-case (e.g., `account-requirements.md`)
- **Headers**: Use descriptive, action-oriented titles
- **Code blocks**: Always specify language for syntax highlighting
- **Links**: Use relative paths for internal documentation
- **Structure**: Follow the existing format in other docs

---

*Last updated: October 31, 2025*
