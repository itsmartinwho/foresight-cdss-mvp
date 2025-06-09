# Development Guide

This document establishes the rules, conventions, and guidelines for developing the Foresight CDSS MVP. These guidelines ensure consistency, quality, and efficient collaboration.

**For architecture, AI tool status, styling, and specific component details, refer to the primary documentation:**
*   [`architecture.md`](./architecture.md)
*   [`frontend_guide.md`](./frontend_guide.md)

## Code Quality Standards

### Linting and Formatting
- **ESLint & Prettier**: The project uses ESLint and Prettier to enforce code style and quality. Ensure your editor is configured to format on save.
- **Pre-commit Checks**: Linting and formatting checks are run automatically before commits.

### Code Review Process
- Run all tests before submitting a pull request.
- Provide clear descriptions of changes and link to relevant issues.
- Address all comments before merging.

## Version Control Practices

### Git Workflow
- **Main Branch**: Always stable and deployable.
- **Feature Branches**: Create from main, use the format `feature/descriptive-name`.
- **Bug Fixes**: Use the format `fix/issue-description`.
- **Commits**: Use conventional commit messages (e.g., `feat(advisor): add new feature`).

## Testing Standards

The project employs a multi-layered testing approach:

- **Unit/Component Tests**: Storybook is used for UI components. Jest and React Testing Library can be used for other unit tests.
- **Integration Tests**: React Testing Library and MSW can be used to test interactions between components and services.
- **End-to-End (E2E) Tests**: Playwright is used for testing complete user flows.

## Documentation

- **Code Documentation**: Use JSDoc/TSDoc to document complex functions and components.
- **Project Documentation**: High-level documentation is maintained in the `/docs` directory.

## Performance

- **Frontend**: Optimize components with memoization, use code splitting and lazy loading, and optimize images.
- **Backend**: Use efficient database queries, cache responses where appropriate, and use pagination for large datasets.

## Security
- **Input Validation**: Validate all user inputs on both the client and server.
- **Authentication & Authorization**: Use Supabase Auth and Row Level Security.
- **Data Protection**: Encrypt sensitive data and use HTTPS.

## Accessibility
The application targets WCAG 2.1 AA compliance. This includes using semantic HTML, providing ARIA attributes, ensuring keyboard navigation, and maintaining sufficient color contrast. 