# Cursor Project Rules for Foresight CDSS MVP

## Overview
This document establishes the rules and conventions for developing the Foresight CDSS MVP using Cursor as the primary code editor. These guidelines ensure consistency, quality, and efficient collaboration across the development team.

**For current architecture, AI tool status (Tool A live, Tools B,C,D,F aspirational), styling, and specific component details, always refer to the primary documentation:**
*   **[../docs/architecture.md](../docs/architecture.md)**
*   **[../docs/frontend-styling-guide.md](../docs/frontend-styling-guide.md)**

## Cursor-Specific Practices

### AI Pair Programming

#### General Rules
- **Cursor Command Usage**: Use `/` commands to access AI features efficiently
- **Context Optimization**: Keep related code in the same file when using AI suggestions
- **History Preservation**: Document AI interactions for complex solutions in code comments
- **Verification Responsibility**: Always verify AI-generated code before committing

#### AI Prompting Best Practices
- **Be Specific**: Include constraints, edge cases, and requirements in prompts
- **Provide Context**: Share necessary background information for better results
- **Iterative Refinement**: Use follow-up prompts to improve initial suggestions
- **Example-Driven**: Provide examples of desired output format when possible

#### When to Use AI Assistance
- **Boilerplate Generation**: For repetitive patterns and standard implementations
- **Refactoring**: When restructuring code without changing functionality
- **Documentation**: For generating docs, comments, and explanations
- **Testing**: For generating test cases and unit tests
- **Debugging**: For identifying potential issues in complex code

#### When Not to Use AI Assistance
- **Security-Critical Code**: Authentication, encryption, sensitive data handling.
- **Complex Business Logic**: Core clinical decision algorithms (especially for aspirational Tools B, C, D, F – these require deep domain expertise and team discussion).
- **Performance-Critical Sections**: Optimize these manually.
- **Architecture Decisions**: Major architectural choices, especially concerning the implementation of new AI tools (Tools B, C, D, F), must be discussed with the team. Refer to `docs/architecture.md` for current and target architectural states.

### Project Navigation

#### File Organization
- **Project Structure**: Follow the defined project structure in **[../docs/architecture.md](../docs/architecture.md)**.
- **File Naming**: Use consistent naming conventions (kebab-case for files, PascalCase for components).
- **Import Organization**: Group imports logically (React, third-party, internal).

#### Cursor Workspace Features
- **Use Workspaces**: Create dedicated workspaces for different feature areas
- **Split Editors**: Use split view for related files (e.g., component and its test)
- **Terminal Integration**: Use built-in terminal for consistent development environment
- **Code Folding**: Maintain folding patterns for readability

## Code Quality Standards

### Linting and Formatting

#### ESLint Configuration
- **Use Project Rules**: Follow the project-specific ESLint configuration
- **Auto-Fix on Save**: Enable ESLint auto-fix in Cursor settings
- **Pre-commit Checks**: Run linting checks before commits

#### Prettier Integration
- **Format on Save**: Enable automatic formatting
- **Configuration Files**: Respect the project's Prettier configuration
- **End of Line**: Use LF for line endings across all files

### Code Review Process

#### Pre-Review Checklist
- Run `npm run lint` and `npm run test` before submitting
- Ensure all files are properly formatted
- Verify TypeScript types are correctly defined
- Remove any debugging code, console logs, or commented-out code

#### Review Requests
- Provide clear descriptions of changes
- Link to relevant issues or requirements
- Include screenshots for UI changes
- Mention specific areas that need careful review

#### Feedback Implementation
- Address all comments before merging
- Use "Resolve conversation" only after fixing issues
- Request re-review for significant changes

## Version Control Practices

### Git Workflow

#### Branching Strategy
- **Main Branch**: Always stable, deployable code
- **Feature Branches**: Create from main, use format `feature/descriptive-name`
- **Bug Fixes**: Use format `fix/issue-description`
- **Release Branches**: Use format `release/vX.Y.Z`

#### Commit Guidelines
- **Atomic Commits**: Each commit should represent a single logical change
- **Conventional Commits**: Use the format `type(scope): description`
- **Types**: feat, fix, docs, style, refactor, test, chore
- **Scope**: Component or feature area affected
- **Body**: Include detailed description for complex changes
- **Breaking Changes**: Mark with `BREAKING CHANGE:` in commit body

#### Pull Request Process
- **Small PRs**: Keep PRs focused on a single feature or fix
- **Description Template**: Fill out the PR template completely
- **CI Checks**: Ensure all CI checks pass before requesting review
- **Reviews Required**: At least one approval before merging

## Development Workflows

### Feature Development

#### Planning
- Review requirements and design documents
- Break down tasks into manageable chunks
- Create feature branch from latest main
- Document API contracts and interfaces before implementation

#### Implementation
- Start with tests where appropriate (TDD approach)
- Implement core functionality first, then edge cases
- Use Cursor AI for boilerplate and routine code
- Document complex logic with clear comments

#### Review and Refinement
- Self-review code before requesting peer review
- Run all tests and ensure passing
- Optimize performance for critical paths
- Ensure accessibility and responsive design

### Bug Fixing

#### Reproduction
- Create reliable reproduction steps
- Document environment, browser, and conditions
- Create automated test case that fails

#### Resolution
- Identify root cause before implementing fix
- Fix the cause, not just the symptoms
- Add test coverage to prevent regression
- Document the fix and its implications

## Testing Standards

_Refer to [../docs/architecture.md#phase-35-testing-and-component-documentation](../docs/architecture.md#phase-35-testing-and-component-documentation) and [../docs/architecture.md#target-state-considerations](../docs/architecture.md#target-state-considerations) for specifics on current testing (Playwright for E2E including Tool A, Storybook for UI components) and future testing needs for aspirational AI tools._

### Test Organization

#### Test Hierarchy
- **Unit Tests**: For individual components and functions (Current: Storybook interaction tests, potentially Jest for utilities. Aspirational: Higher coverage, especially for AI logic in future tools).
- **Integration Tests**: Component interactions and API touchpoints (Current: Basic testing for `/api/advisor`. Aspirational: More for future AI services).
- **E2E Tests**: Complete user flows (Current: Playwright for key flows including Tool A. Aspirational: Coverage for Tools B, C, D, F as developed).

#### Naming Conventions
- **Test Files**: `[component-name].test.tsx` (Jest/RTL), `*.spec.ts` (Playwright), `*.stories.tsx` (Storybook).

### Testing Best Practices
- Test behavior, not implementation details
- Prefer testing through user interaction
- Avoid brittle tests dependent on implementation
- Use meaningful test data
- Keep tests independent and idempotent

## Documentation Requirements

_Primary project documentation, including architecture, AI tool descriptions, and styling guides, resides in the `/docs` directory (e.g., `docs/architecture.md`, `docs/frontend-styling-guide.md`). Code-level documentation should complement this._

### Code Documentation

#### Component Documentation
- Purpose and responsibility
- Props interface with descriptions
- Usage examples
- Known limitations or edge cases

#### Function Documentation
- Purpose and behavior
- Parameter descriptions
- Return value description
- Side effects, if any

#### Architecture Documentation
- **Source of Truth:** Detailed architecture, including component relationships, data flow, state management, API contracts, and the status/design of AI tools (A, B, C, D, F) is maintained in **[../docs/architecture.md](../docs/architecture.md)**.
- Code comments should clarify specific implementation choices within this architecture.

### Project Documentation

#### Technical Documentation
- Setup instructions: See `README.md` and `.cursor/rules/development_environment.md`.
- Development workflow: General practices in this document; specific architectural patterns in `docs/architecture.md`.
- Testing strategy: High-level in this document; specifics (Playwright, Storybook) and AI testing needs in `docs/architecture.md`.
- Deployment process: See `docs/architecture.md` for notes on deployment considerations.

#### User Documentation
- Feature guides
- API documentation
- Error handling guide
- Troubleshooting information

## Performance Guidelines

### Frontend Performance

#### Optimization Techniques
- Memoize expensive calculations
- Virtualize long lists
- Use code splitting and lazy loading
- Optimize image and asset loading
- Employ efficient state management

#### Performance Metrics
- First Contentful Paint < 1.2s
- Total Blocking Time < 300ms
- Cumulative Layout Shift < 0.1
- Lighthouse score > 90

### Backend Performance

#### API Optimization
- Efficient database queries
- Appropriate indexing
- Response caching
- Pagination for large data sets
- Request batching where appropriate

#### Performance Monitoring
- Track API response times
- Monitor database query performance
- Set up alerts for performance degradation
- Conduct regular performance reviews

## Security Practices

### Secure Coding

#### Input Validation
- Validate all user inputs
- Sanitize data before processing
- Use parameterized queries for database
- Implement content security policies

#### Authentication & Authorization
- Use proper JWT handling
- Implement role-based access control
- Set secure and HTTP-only cookies
- Apply principle of least privilege

#### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all connections
- Implement proper error handling (no leaks)
- Regular security scanning

## Accessibility Standards

### Implementation Requirements
- Semantic HTML structure
- Keyboard navigation support
- ARIA attributes where needed
- Sufficient color contrast
- Screen reader compatibility

### Testing Requirements
- Automated accessibility testing
- Manual keyboard navigation testing
- Screen reader testing
- Color contrast verification
- Compliance with WCAG 2.1 AA

## Deployment and DevOps

### Deployment Process

#### Environment Management
- Use environment variables for configuration
- Match development environment to production
- Document environment requirements

#### Release Checklist
- All tests passing
- Performance benchmarks met
- Security scan completed
- Documentation updated
- Accessibility requirements met
- Proper versioning applied

### Monitoring and Maintenance

#### Health Checks
- Implement application health endpoints
- Set up monitoring for critical paths
- Configure alerts for system issues

#### Error Tracking
- Implement centralized error logging
- Set up alerting for critical errors
- Document common error resolution steps

## Conclusion
Following these Cursor project rules will ensure consistent, high-quality development of the Foresight CDSS MVP. All team members are expected to adhere to these guidelines and suggest improvements to the process as needed.