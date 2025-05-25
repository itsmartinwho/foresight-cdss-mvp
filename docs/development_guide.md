# Development Guide for Foresight CDSS MVP

## Overview
This document establishes the rules, conventions, and guidelines for developing the Foresight CDSS MVP. These guidelines ensure consistency, quality, and efficient collaboration.

**For current architecture, AI tool status (Tool A live, Tools B,C,D,F aspirational), styling, and specific component details, always refer to the primary documentation:**
*   [./architecture.md](./architecture.md)
*   [./frontend_guide.md](./frontend_guide.md) (incorporates previous styling guide)

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
- **Architecture Decisions**: Major architectural choices, especially concerning the implementation of new AI tools (Tools B, C, D, F), must be discussed with the team. Refer to `architecture.md` for current and target architectural states.

### Project Navigation

#### File Organization
- **Project Structure**: Follow the defined project structure in [./architecture.md](./architecture.md).
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
- Run `pnpm run lint`, `pnpm run test:e2e` (for Playwright E2E tests), and `pytest tests/` (for Python unit/integration tests) before submitting.
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

_Refer to [./architecture.md#phase-35-testing-and-component-documentation](./architecture.md#phase-35-testing-and-component-documentation) and [./architecture.md#target-state-considerations](./architecture.md#target-state-considerations) for specifics on current testing (Playwright for E2E including Tool A, Storybook for UI components) and future testing needs for aspirational AI tools._

### Overall Testing Strategy
The project employs a multi-layered testing approach to ensure software quality, covering different aspects of the application:

*   **Unit Tests / Component Tests:**
    *   **Focus:** Individual components, functions, and UI elements in isolation.
    *   **Tools:** Primarily [Storybook](https://storybook.js.org/) for UI components. Stories define different states and allow for interaction testing. For utility functions or complex logic within components not easily covered by Storybook interaction tests, [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) may be used.
    *   **Scope:** Verify component rendering, props handling, event handling, and basic business logic within components.
    *   **Location:** Typically co-located with the component (e.g., `*.stories.tsx`, `*.test.tsx`).

*   **Integration Tests:**
    *   **Focus:** Interactions between multiple components, services, or API touchpoints.
    *   **Tools:** Can involve React Testing Library for testing component compositions, or dedicated tests for API route interactions (e.g., testing `/api/advisor` behavior). [Mock Service Worker (MSW)](https://mswjs.io/) can be used for mocking API responses in frontend integration tests.
    *   **Scope:** Ensure that different parts of the application work together as expected. For example, testing if a form component correctly calls a service and updates the UI based on the response.
    *   **Location:** May reside in `tests/integration/` or be co-located with the primary component being tested if the integration is tightly coupled.

*   **End-to-End (E2E) Tests:**
    *   **Focus:** Complete user flows through the application, simulating real user scenarios from the UI.
    *   **Tools:** [Playwright](https://playwright.dev/) is used for E2E testing.
    *   **Scope:** Verify critical user journeys, such as logging in, navigating through patient lists, interacting with the Advisor (Tool A), and other core functionalities.
    *   **Location:** E2E tests (`*.spec.ts`) and their configuration (`playwright.config.ts`) are located in the `tests/` directory.

*   **Manual Testing / User Acceptance Testing (UAT):**
    *   **Focus:** Exploratory testing by developers, QAs, or stakeholders to catch issues not covered by automated tests and to validate user experience.
    *   **Scope:** New features, complex workflows, visual regressions, and overall usability.

### Test Organization and Naming

*   **Unit/Component Tests:**
    *   Storybook: `ComponentName.stories.tsx`
    *   Jest/RTL: `ComponentName.test.tsx` or `functionName.test.ts`
*   **Integration Tests:** `FeatureName.integration.test.tsx` or similar descriptive names.
*   **E2E Tests (Playwright):** `*.spec.ts` (e.g., `auth.spec.ts`, `advisor.spec.ts`).

### Testing Best Practices
- **Test Behavior, Not Implementation:** Focus tests on what the code does, not how it does it. This makes tests more resilient to refactoring.
- **Realistic Test Data:** Use data that mirrors real-world scenarios. For patient data, this means including varied demographics, conditions, and histories.
- **Independent Tests:** Ensure tests can run independently and in any order without affecting each other.
- **Clear Assertions:** Make assertions specific and easy to understand.
- **Readable Tests:** Write tests that are clear and maintainable.
- **Coverage:** Aim for good test coverage of critical paths and complex logic. However, focus on quality over quantity.
- **CI Integration:** Ensure all automated tests are run as part of the Continuous Integration (CI) pipeline.

### Specific Test Areas (Conceptual from `test-plan.md`)

While `test-plan.md` provided a high-level list, here's how its concepts integrate into the testing strategy:

*   **Patient Data Service (`supabaseDataService.ts`):**
    *   Unit/Integration tests for methods interacting with Supabase. This might involve mocking the Supabase client or testing against a test database instance.
    *   Verify correct data retrieval, filtering (e.g., by condition), and parsing.
*   **Clinical Engine Service (`clinicalEngineService.ts` - Mock Service, `src/clinical_engine_prototype/engine.py` - Prototype):**
    *   `clinicalEngineService.ts` (Frontend Mock): Test its mock implementations to ensure they provide consistent data for UI development.
    *   `src/clinical_engine_prototype/engine.py` (Python Prototype for Tool B): Has its own dedicated Python tests (see `tests/test_clinical_engine.py`). These cover its internal logic for plan generation, execution, diagnosis, trial matching, etc. When/if this engine is integrated, new integration tests will be needed.
*   **Transcription Service (Future/Aspirational):**
    *   If implemented, would require unit tests for transcription accuracy, note generation logic, and integration tests with the UI.
*   **Alert Service (Future/Aspirational for Tool D):**
    *   If Tool D is developed, its logic for complex case detection and co-pilot suggestions would need thorough unit and integration testing.
*   **UI Component Testing (Covered by Storybook, Jest/RTL):**
    *   Navigation, layout, patient list, patient detail, consultation view, diagnostic advisor components. Each interactive element and display logic should be tested.

**Consultation Filtering Logic**
- Both the Dashboard and Patients tab use robust filtering for upcoming and past consultations.
- The only threshold is the current date and time: if a consultation's (admission's) `scheduledStart` is in the future, it is considered "Upcoming"; if it is in the past, it is considered "Past".
- This is enforced in the service layer via `supabaseDataService.getUpcomingConsultations()` and `supabaseDataService.getPastConsultations()`, which should be used for all such filtering in the UI.
- This ensures that all data is categorized by actual scheduled time, regardless of year.
*   **Browser Compatibility & Mobile Responsiveness:**
    *   Primarily covered by Playwright E2E tests which can be run across different browser engines.
    *   Visual regression testing (e.g., with Playwright or Storybook addons) can help catch layout issues on different viewports.
    *   Manual testing on target devices and browsers is also important.

## Documentation Requirements

_Primary project documentation, including architecture, AI tool descriptions, and styling guides, resides in the `/docs` directory (e.g., `architecture.md`, `frontend_guide.md`). Code-level documentation should complement this._

### Code Documentation

#### Component Documentation
- Purpose and responsibility
- Props interface with descriptions
- Usage examples (often in Storybook)
- Known limitations or edge cases

#### Function Documentation
- Purpose and behavior
- Parameter descriptions
- Return value description
- Side effects, if any

#### Architecture Documentation
- **Source of Truth:** Detailed architecture, including component relationships, data flow, state management, API contracts, and the status/design of AI tools (A, B, C, D, F) is maintained in [./architecture.md](./architecture.md).
- Code comments should clarify specific implementation choices within this architecture.

### Project Documentation
- **Setup instructions:** See `README.md`.
- **Development workflow:** This document. Specific architectural patterns in `architecture.md`.
- **Testing strategy:** Detailed in this document.
- **Deployment process:** See `architecture.md` for notes on deployment considerations.

## Performance Guidelines

### Frontend Performance

#### Optimization Techniques
- Memoize expensive calculations (`React.memo`, `useMemo`, `useCallback`).
- Virtualize long lists (e.g., using `react-window` or `react-virtualized` if needed).
- Use code splitting and lazy loading (Next.js does this by default for pages; consider for large components/libraries).
- Optimize image and asset loading (Next.js `<Image>` component, preloading critical assets).
- Employ efficient state management to avoid unnecessary re-renders.

#### Performance Metrics (Targets)
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Total Blocking Time (TBT): < 300ms
- Cumulative Layout Shift (CLS): < 0.1
- Lighthouse score: Aim for > 90 in Performance.

### Backend Performance (Next.js API Routes, Supabase)

#### API Optimization
- Efficient database queries (proper indexing in Supabase, selective column fetching).
- Response caching where appropriate (e.g., using Vercel's edge caching or custom caching headers).
- Pagination for large data sets (already implemented for patient lists).
- Optimize OpenAI API calls: ensure prompts are concise, stream responses.

#### Performance Monitoring
- Track API response times (Vercel analytics, or other monitoring tools).
- Monitor Supabase query performance (Supabase dashboard).
- Set up alerts for performance degradation.
- Conduct regular performance reviews.

## Security Practices

### Secure Coding

#### Input Validation
- Validate all user inputs on the client and server-side, especially for API routes.
- Sanitize data before processing or storing if it comes from untrusted sources or will be rendered as HTML. React helps prevent XSS by default when rendering strings.
- Use parameterized queries for database interactions (Supabase client handles this).
- Implement Content Security Policies (CSP) if needed for enhanced security.

#### Authentication & Authorization (Supabase Auth)
- Ensure proper JWT handling if custom logic interacts with tokens.
- Implement role-based access control if different user roles are introduced. Supabase RLS (Row Level Security) is key here.
- Set secure and HTTP-only cookies if applicable (Next.js API routes can configure this).
- Apply the principle of least privilege for database access and API permissions.

#### Data Protection
- Encrypt sensitive data at rest (Supabase provides this for its database).
- Use HTTPS for all connections (Vercel and Supabase enforce this).
- Implement proper error handling to avoid leaking sensitive information in error messages.
- Regular security scanning of dependencies (`pnpm audit`).

## Accessibility Standards (WCAG 2.1 AA Target)

### Implementation Requirements
- **Semantic HTML:** Use HTML elements according to their meaning (e.g., `<nav>`, `<button>`, `<article>`).
- **Keyboard Navigation:** All interactive elements must be focusable and operable via keyboard.
- **ARIA Attributes:** Use ARIA (Accessible Rich Internet Applications) attributes where semantic HTML is insufficient to convey role, state, or properties (Radix UI components, used by Shadcn/UI, handle this well).
- **Sufficient Color Contrast:** Ensure text and interactive elements meet contrast ratios (e.g., 4.5:1 for normal text).
- **Screen Reader Compatibility:** Test with screen readers (VoiceOver, NVDA, JAWS) to ensure a good experience.
- **Form Labels:** All form inputs must have associated labels.
- **Alternative Text:** Provide descriptive alt text for all meaningful images.

### Testing Requirements
- Automated accessibility testing (e.g., Axe DevTools browser extension, `eslint-plugin-jsx-a11y`).
- Manual keyboard navigation testing.
- Screen reader testing for critical user flows.
- Color contrast verification.

## Deployment and DevOps

### Deployment Process (Vercel, Supabase)

#### Environment Management
- Use environment variables for configuration (e.g., Supabase URL/keys, OpenAI key). Store them securely (e.g., Vercel environment variables).
- Ensure development, staging (if used), and production environments are consistently configured.
- Document all required environment variables in `.env.example`.

#### Release Checklist
- All automated tests (unit, integration, E2E) passing.
- Performance benchmarks met.
- Security scan completed (e.g., dependency audit).
- Documentation updated (README, /docs).
- Accessibility requirements reviewed.
- Proper versioning applied (if applicable, e.g., Git tags).

### Monitoring and Maintenance

#### Health Checks
- Implement application health endpoints if deploying custom backend services (not typically needed for Next.js/Vercel setups directly).
- Set up monitoring for critical API routes (e.g., `/api/advisor`) and Supabase performance.
- Configure alerts for system issues (e.g., high error rates on Vercel, Supabase database issues).

#### Error Tracking
- Implement centralized error logging (e.g., Sentry, Logflare with Vercel).
- Set up alerting for critical errors.
- Document common error resolution steps.

## Conclusion
Following these development guidelines will help ensure consistent, high-quality development of the Foresight CDSS MVP. All team members are expected to adhere to these guidelines and suggest improvements to the process as needed. 