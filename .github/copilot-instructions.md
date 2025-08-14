# AWS IAM Simplified - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js TypeScript project for simplifying AWS IAM management. The main goal is to help users easily understand what resources a specific user can access in AWS accounts.

## Key Principles
1. **Keep everything simple** - No overengineering
2. **Use AWS SDK v3** - Modern AWS SDK for JavaScript/TypeScript

## Tech Stack
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- AWS SDK v3 (@aws-sdk/client-iam, @aws-sdk/client-sts)

## Code Style Guidelines
- Use functional components with hooks
- Prefer async/await over promises
- Keep components small and focused
- Use TypeScript interfaces for AWS responses
- Handle errors gracefully with user-friendly messages
- Avoid using try & catch

## AWS Integration Notes
- Use environment variables for AWS configuration
- Implement proper credential handling
- Focus on IAM user permissions and resource access
- Keep API calls efficient and minimal

## File Structure
- `/src/app` - Next.js App Router pages and layouts
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and AWS service wrappers
- `/src/types` - TypeScript type definitions
