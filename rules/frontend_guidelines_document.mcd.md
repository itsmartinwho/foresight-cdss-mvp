# Frontend Guidelines Document for Foresight CDSS MVP

## Current MVP Status (April 2024)

The guidelines below describe our *target* best-practices. The present codebase already follows many of them, but note the following:

1. We only have a **Next.js 15 / React 19** single-repo front-end – no separate design system package yet.
2. Backend APIs referenced here are **mocked** in `src/lib/*Service.ts` and served client-side.
3. Storybook, Cypress, and E2E infrastructure is **not in the repo** yet; they remain on the roadmap.
4. The design system currently re-uses **shadcn/ui** components straight from source; a dedicated in-house component library is planned.

Feel free to implement improvements incrementally – nothing below is a hard requirement until the supporting tooling lands.

---

## Overview
This document establishes the frontend development guidelines for the Foresight Clinical Decision Support System (CDSS) MVP. These guidelines ensure code consistency, maintainability, and adherence to best practices across the project.

## Code Organization

### Project Structure
```
/src
├── app/                  # Next.js app directory
│   ├── (auth)/           # Authentication-related routes
│   ├── advisor/          # Clinical advisor features
│   ├── consultation/     # Consultation management
│   ├── patients/         # Patient management
│   ├── api/              # API routes (if using Next.js API)
│   └── layout.tsx        # Root layout component
├── components/           # Reusable components
│   ├── ui/               # Basic UI components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── forms/            # Form-related components
│   ├── charts/           # Visualization components
│   ├── layout/           # Layout components
│   └── [feature]/        # Feature-specific components
├── hooks/                # Custom React hooks
│   ├── use-auth.ts
│   ├── use-patients.ts
│   └── ...
├── lib/                  # Utilities and helpers
│   ├── api.ts            # API client
│   ├── validation.ts     # Form validation schemas
│   ├── utils.ts          # General utilities
│   └── constants.ts      # Application constants
├── types/                # TypeScript type definitions
├── styles/               # Global styles
└── public/               # Static assets
```

### Component Organization
- **One component per file**: Each component should be in its own file
- **Co-locate related files**: Keep component-specific styles, tests, and utilities together
- **Component naming**: Use PascalCase for component files and names
- **Index files**: Use index files for cleaner imports

## Coding Standards

### TypeScript
- **Use TypeScript**: All components and functions should have proper type definitions
- **Avoid `any`**: Use specific types or `unknown` when type is unclear
- **Use interfaces**: For complex object types
- **Type props**: Always type component props with interfaces
- **Export types**: Make types available for reuse when appropriate

### React & Components
- **Functional components**: Use functional components with hooks instead of class components
- **Custom hooks**: Extract reusable logic into custom hooks
- **Component size**: Keep components focused on a single responsibility
- **Props destructuring**: Destructure props in function parameters
- **Default props**: Use default parameter values for optional props
- **Prop naming**: Use clear, descriptive prop names

### File Naming Conventions
- **Component files**: `ComponentName.tsx`
- **Hook files**: `use-hook-name.ts`
- **Utility files**: `descriptive-name.ts`
- **Test files**: `ComponentName.test.tsx` or `ComponentName.spec.tsx`

## State Management

### Local State
- **useState**: For simple component-level state
- **useReducer**: For complex component-level state
- **Component composition**: Pass state down to child components via props

### Global State
- **React Context**: For shared state across components
- **SWR/React Query**: For server state and caching
- **Zustand**: For complex application state when needed
- **State organization**: Organize global state by domain/feature

### Data Fetching
- **React Query/SWR**: Use for data fetching and caching
- **Loading states**: Always handle loading states
- **Error handling**: Always handle error states
- **Optimistic updates**: Use for better user experience when appropriate
- **Prefetching**: Consider prefetching data for expected user journeys

## Styling

### Tailwind CSS
- **Utility classes**: Use Tailwind's utility classes for styling
- **Component consistency**: Maintain consistent styling across similar components
- **Mobile-first**: Design for mobile first, then enhance for larger screens
- **Custom classes**: Use `@apply` sparingly in global CSS for repeated patterns
- **Theme configuration**: Use Tailwind's theme configuration for customization

### Component Styling
- **Responsive design**: Ensure all components work on all target screen sizes
- **Dark mode**: Support dark mode where applicable
- **Color variables**: Use theme colors rather than hardcoded values
- **Spacing consistency**: Use consistent spacing variables
- **Hover/focus states**: Include appropriate interactive states

### Design System Integration
- **Use Shadcn/UI components**: Leverage existing component library
- **Consistent styling**: Maintain consistency with design system
- **Extend components**: Extend rather than duplicate functionality
- **Component documentation**: Document custom component APIs

## Forms and Validation

### Form Handling
- **React Hook Form**: Use for all form state management
- **Form structure**: Consistent form layouts and field grouping
- **Field components**: Reusable form field components with consistent API
- **Form submission**: Handle submission, loading, and error states

### Validation
- **Zod schemas**: Define validation schemas with Zod
- **Field-level validation**: Provide immediate feedback
- **Form-level validation**: For cross-field validations
- **Error messages**: Clear, actionable error messages
- **Validation timing**: Validate on blur/change as appropriate for the field

## Performance Optimization

### Component Optimization
- **Memoization**: Use `React.memo()` for expensive components
- **useCallback/useMemo**: For referential equality in dependencies
- **Virtualization**: Use virtualized lists for long lists
- **Image optimization**: Use Next.js Image component with appropriate sizing
- **Code splitting**: Use dynamic imports for less critical components

### Rendering Optimization
- **Keys**: Always use stable, unique keys for lists
- **Avoid re-renders**: Prevent unnecessary re-renders
- **Perf monitoring**: Use React DevTools Profiler to identify issues
- **Web Vitals**: Monitor core web vitals in production

## Accessibility

### Base Requirements
- **Semantic HTML**: Use appropriate HTML elements
- **ARIA attributes**: Add ARIA attributes when semantic HTML isn't sufficient
- **Keyboard navigation**: Ensure all interactions are keyboard accessible
- **Focus management**: Proper focus handling for interactive elements
- **Screen reader testing**: Test with screen readers

### Implementation Guidelines
- **Color contrast**: Maintain 4.5:1 minimum contrast ratio
- **Focus styles**: Visible focus indicators
- **Form labels**: Proper labeling for all form controls
- **Alternative text**: For all images and non-text content
- **Skip links**: For keyboard navigation
- **Heading hierarchy**: Proper heading structure

## Testing

### Component Testing
- **React Testing Library**: Use for component tests
- **Test coverage**: Aim for 80%+ coverage of components
- **Critical paths**: Prioritize testing critical user flows
- **Content testing**: Test for expected content
- **Interaction testing**: Test user interactions

### Mock Strategy
- **API mocking**: Mock API calls in component tests
- **MSW**: Use for realistic API mocking
- **Test fixtures**: Create reusable test data
- **Mock consistency**: Keep mocks aligned with actual data shapes

## Documentation

### Code Documentation
- **JSDoc/TSDoc**: Document complex functions and components
- **Props documentation**: Document component props
- **Example usage**: Include examples for complex components

### Component Showcasing
- **Storybook**: Create stories for all reusable components
- **Interactive documentation**: Include interactive examples
- **Variant documentation**: Document component variants and props

## Internationalization

### Translation Strategy
- **i18next**: Use for translations
- **Translation keys**: Organized by feature/component
- **Variable interpolation**: Use for dynamic content
- **Pluralization**: Handle pluralization correctly
- **RTL support**: Support right-to-left languages if required

## Error Handling

### UI Error States
- **Error boundaries**: Use React error boundaries
- **Fallback UIs**: Graceful degradation on errors
- **Retry mechanisms**: Allow users to retry failed operations
- **Error logging**: Log errors to monitoring service
- **User feedback**: Clear error messages to users

### Debugging
- **Error tracking**: Integrate with Sentry or similar service
- **Error context**: Include relevant context with errors
- **Console warnings**: Use development warnings for common mistakes

## Security Best Practices

### Frontend Security
- **XSS prevention**: Avoid dangerous patterns like innerHTML
- **CSRF protection**: Include CSRF tokens in requests
- **Content Security Policy**: Configure appropriate CSP
- **Sensitive data**: Never store sensitive data in localStorage or client-side
- **Input sanitization**: Sanitize user inputs

## Browser Compatibility

### Support Targets
- **Browser list**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Polyfills**: Include for required features
- **Graceful degradation**: Provide fallbacks for unsupported features
- **Testing**: Cross-browser testing for critical features

## Code Quality Tools

### Linting and Formatting
- **ESLint**: Follow project ESLint rules
- **Prettier**: Use for code formatting
- **TypeScript strict mode**: Enable for type safety
- **Pre-commit hooks**: Run linting and testing before commits

### Pull Request Guidelines
- **PR size**: Keep PRs focused and manageable
- **Description**: Clear description of changes
- **Screenshots**: Include for UI changes
- **Testing instructions**: How to test the changes
- **Code review**: Required before merging