# Frontend Guidelines Document for Foresight CDSS MVP

## Current MVP Status & Authoritative Documentation

**The primary sources of truth for current frontend architecture, AI tool implementation, styling, and component details are:**
*   **[../docs/architecture.md](../docs/architecture.md)**
*   **[../docs/frontend-styling-guide.md](../docs/frontend-styling-guide.md)**

This document outlines *target* best-practices and a comprehensive set of guidelines. Many are followed in the present codebase, but note the following regarding the actual implementation detailed in the authoritative docs linked above:

1.  The project is a **Next.js 15 / React 19** single-repo front-end. (See `docs/architecture.md` for structure).
2.  **AI Functionality:**
    *   **Tool A (Advisor):** The primary existing AI feature is an OpenAI-powered chatbot in the "Advisor" tab. (See `docs/architecture.md` for details on `/api/advisor`).
    *   **Aspirational AI Tools (B, C, D, F):** Other AI tools like a Diagnosis/Treatment Engine (Tool B), Medical Co-pilot (Tool C), Complex Conditions Alerts (Tool D), and Clinical Trial Matching (Tool F) are aspirational. Placeholder UI elements for some of these (e.g., for displaying diagnoses, treatments, alerts, trial lists) exist in the frontend and may currently show mock data or be empty. (See `docs/architecture.md` for specifics).
3.  Backend APIs are primarily **Supabase (PostgreSQL)** with custom Next.js API routes (e.g., `/api/advisor` for Tool A). `src/lib/clinicalEngineService.ts` is a mock service for frontend development of aspirational features and does **not** power Tool A. (See `docs/architecture.md` for backend and service details).
4.  **Storybook** and **Playwright (E2E tests)** are in use for some components and critical flows. (See `docs/architecture.md`).
5.  The design system uses **shadcn/ui** components (built on Radix UI) and custom components in `src/components/ui/`. (See `docs/architecture.md`).

Always refer to `docs/architecture.md` and `docs/frontend-styling-guide.md` for the current, implemented truth. Sections below describing features or tools not detailed as "current" in those core docs are likely **aspirational** or general best practices.

---

## Overview
This document establishes general frontend development guidelines for the Foresight CDSS MVP.

## Code Organization

_For the current project structure and component organization, refer to [../docs/architecture.md#directory-structure-highlights](../docs/architecture.md#directory-structure-highlights) and [../docs/architecture.md#component-architecture](../docs/architecture.md#component-architecture)._

### Project Structure (General Template)
```
/src
├── app/                  # Next.js app directory (See docs/architecture.md)
│   ├── advisor/          # Contains UI for Tool A (Advisor)
│   ├── consultation/     # Consultation management
│   ├── patients/         # Patient management
│   ├── api/              # API routes (e.g., /api/advisor - See docs/architecture.md)
│   └── layout.tsx        # Root layout component (See docs/architecture.md)
├── components/           # Reusable components (See docs/architecture.md)
│   ├── views/            # Main view components (e.g., AdvisorView.tsx for Tool A, views with placeholder UI for Tools B,D,F)
│   ├── ui/               # Basic UI components (shadcn/ui based - See docs/architecture.md)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── forms/            # Form-related components (Aspirational for dedicated dir)
│   ├── charts/           # Visualization components (e.g., Recharts, if used - Aspirational for dedicated dir)
│   ├── layout/           # Layout components (e.g., GlassHeader, ContentSurface - See docs/architecture.md)
│   └── [feature]/        # Feature-specific components (Typically in src/components/views/ - See docs/architecture.md)
├── hooks/                # Custom React hooks (See src/hooks/, if any)
│   ├── use-auth.ts       # Aspirational or Supabase-specific
│   ├── use-patients.ts   # Aspirational or part of data services
│   └── ...
├── lib/                  # Utilities and helpers
│   ├── clinicalEngineService.ts # MOCK service for aspirational Tools B & F (NOT for Tool A)
│   ├── api.ts            # Aspirational for a generic API client beyond Supabase/fetch
│   ├── validation.ts     # Form validation schemas (e.g., Zod, if used system-wide)
│   ├── utils.ts          # General utilities
│   └── constants.ts      # Application constants
├── types/                # TypeScript type definitions (Project-wide types)
├── styles/               # Global styles (globals.css - See docs/frontend-styling-guide.md)
└── public/               # Static assets
```

### Component Organization
- **One component per file**: Each component should be in its own file (Current practice)
- **Co-locate related files**: Keep component-specific styles (if not using Tailwind directly), tests, and stories together where practical.
- **Component naming**: Use PascalCase for component files and names (Current practice)
- **Index files**: Use index files for cleaner imports from directories (e.g., `src/components/ui/index.ts` if helpful).

## Coding Standards

### TypeScript
- **Use TypeScript**: All components and functions should have proper type definitions (Current practice).
- **Avoid `any`**: Use specific types or `unknown` when type is unclear. See `docs/architecture.md` for examples of typing improvements.
- **Use interfaces/types**: For complex object types (Current practice using `type` and `interface`).
- **Type props**: Always type component props (Current practice).
- **Export types**: Make types available for reuse when appropriate (Current practice).

### React & Components
- **Functional components**: Use functional components with hooks instead of class components (Current practice).
- **Custom hooks**: Extract reusable logic into custom hooks (`src/hooks/` if applicable).
- **Component size**: Keep components focused on a single responsibility (General goal).
- **Props destructuring**: Destructure props in function parameters (Common practice).
- **Default props**: Use default parameter values for optional props (Common practice).
- **Prop naming**: Use clear, descriptive prop names (General goal).

### File Naming Conventions
- **Component files**: `ComponentName.tsx` (Current practice)
- **Hook files**: `use-hook-name.ts` (Current practice)
- **Utility files**: `descriptive-name.ts` (Current practice, e.g., `supabaseClient.ts`)
- **Test files**: `ComponentName.test.tsx` or `ComponentName.spec.tsx` (Jest/RTL), `*.spec.ts` (Playwright E2E tests), `*.stories.tsx` (Storybook)

## State Management

_Refer to [../docs/architecture.md#ui-patterns-conventions-and-styling](../docs/architecture.md#ui-patterns-conventions-and-styling) (specifically State Management subsection) for current practices (React state/Context, `ForesightApp.tsx` for app-level state)._

### Local State
- **useState**: For simple component-level state (Current practice).
- **useReducer**: For complex component-level state (Used where appropriate).
- **Component composition**: Pass state down to child components via props (Current practice).

### Global State
- **React Context**: For shared state across components (Primary current method for global state, e.g. in `ForesightApp.tsx`).
- **SWR/React Query**: For server state and caching (Considered/aspirational if not already in broad use beyond simple fetch; Supabase client has its own caching/querying).
- **Zustand**: For complex application state when needed (Aspirational, not currently listed in `docs/architecture.md`).
- **State organization**: Organize global state by domain/feature (General goal).

### Data Fetching
- **Primary Method**: `supabaseDataService.ts` or direct Supabase client calls. For `/api/advisor`, standard `fetch`.
- **React Query/SWR**: (Aspirational if not primary method) Use for data fetching and caching.
- **Loading states**: Always handle loading states (Current practice).
- **Error handling**: Always handle error states (Current practice, e.g. `ErrorDisplay.tsx`).
- **Optimistic updates**: Use for better user experience when appropriate (Aspirational).
- **Prefetching**: Consider prefetching data for expected user journeys (Aspirational).

## Styling

_For detailed styling conventions, including Tailwind CSS usage, glassmorphism, typography, layout patterns, and placeholder styling, refer to **[../docs/frontend-styling-guide.md](../docs/frontend-styling-guide.md)**._

### Tailwind CSS
- **Utility classes**: Use Tailwind's utility classes for styling (Current practice).
- **Component consistency**: Maintain consistent styling across similar components (Goal, guided by `frontend-styling-guide.md`).
- **Mobile-first**: Design for mobile first, then enhance for larger screens (General approach).
- **Custom classes**: Use `@apply` sparingly in global CSS for repeated patterns (Current practice in `globals.css`).
- **Theme configuration**: Use Tailwind's theme configuration for customization (`tailwind.config.js`).

### Component Styling
- **Responsive design**: Ensure all components work on all target screen sizes (Goal, guided by `frontend-styling-guide.md`).
- **Dark mode**: (Aspirational if not fully implemented) Support dark mode where applicable.
- **Color variables**: Use theme colors rather than hardcoded values (Current practice, see `globals.css`).
- **Spacing consistency**: Use consistent spacing variables (From Tailwind theme).
- **Hover/focus states**: Include appropriate interactive states (Current practice).

### Design System Integration
- **Use Shadcn/UI components**: Leverage existing component library built on Radix UI (Current practice, see `src/components/ui/` and `docs/architecture.md`).
- **Consistent styling**: Maintain consistency with design system and `frontend-styling-guide.md`.
- **Extend components**: Extend rather than duplicate functionality (General goal).
- **Component documentation**: Document custom component APIs (Partially via Storybook, see `docs/architecture.md`).

## Forms and Validation

### Form Handling
- **React Hook Form**: (Aspirational for system-wide adoption) Use for all form state management.
- **Current Practice**: Standard React state and event handlers for forms (e.g., modals). `StyledDatePicker` is a custom date picker.
- **Form structure**: Consistent form layouts and field grouping (General goal).
- **Field components**: Reusable form field components with consistent API (e.g., `Input` from Shadcn, custom `StyledDatePicker`).
- **Form submission**: Handle submission, loading, and error states (Current practice).

### Validation
- **Zod schemas**: (Aspirational for system-wide adoption) Define validation schemas with Zod.
- **Current Practice**: Manual validation or simple checks.
- **Field-level validation**: Provide immediate feedback (Where appropriate).
- **Form-level validation**: For cross-field validations (Where appropriate).
- **Error messages**: Clear, actionable error messages (Goal, e.g., using `ErrorDisplay.tsx`).
- **Validation timing**: Validate on blur/change as appropriate for the field.

## Performance Optimization

_Refer to [../docs/architecture.md#build-performance-and-deployment-considerations](../docs/architecture.md#build-performance-and-deployment-considerations) for current performance notes and potential enhancements._

### Component Optimization
- **Memoization**: Use `React.memo()` for expensive components (Where applicable).
- **useCallback/useMemo**: For referential equality in dependencies (Where applicable).
- **Virtualization**: Use virtualized lists for long lists (Aspirational, if needed).
- **Image optimization**: Use Next.js Image component with appropriate sizing (If using `<Image>`, current app seems to use `<img>` or CSS backgrounds more).
- **Code splitting**: Use dynamic imports for less critical components (Next.js does this by default for pages; `docs/architecture.md` mentions lazy loading Recharts as potential).

### Rendering Optimization
- **Keys**: Always use stable, unique keys for lists (Current practice).
- **Avoid re-renders**: Prevent unnecessary re-renders (General goal).
- **Perf monitoring**: Use React DevTools Profiler to identify issues (Developer tool).
- **Web Vitals**: Monitor core web vitals in production (Possible via Vercel analytics or similar).

## Accessibility

_Refer to [../docs/frontend-styling-guide.md#accessibility--responsiveness](../docs/frontend-styling-guide.md#accessibility--responsiveness) and Radix UI documentation for base accessibility._

### Base Requirements
- **Semantic HTML**: Use appropriate HTML elements (Current practice, guided by Radix/Shadcn).
- **ARIA attributes**: Add ARIA attributes when semantic HTML isn't sufficient (Radix provides many out-of-the-box).
- **Keyboard navigation**: Ensure all interactions are keyboard accessible (Key for Radix components).
- **Focus management**: Proper focus handling for interactive elements (Key for Radix components).
- **Screen reader testing**: Test with screen readers (Aspirational for formal, regular testing).

### Implementation Guidelines
- **Color contrast**: Maintain 4.5:1 minimum contrast ratio (Goal).
- **Focus styles**: Visible focus indicators (Provided by browser/Tailwind/Radix).
- **Form labels**: Proper labeling for all form controls (Goal).
- **Alternative text**: For all images and non-text content (Goal, e.g. `Foresight Logo` alt text is tested).
- **Skip links**: For keyboard navigation (Aspirational, if complex layouts require it).
- **Heading hierarchy**: Proper heading structure (Goal).

## Testing

_Refer to [../docs/architecture.md#phase-35-testing-and-component-documentation](../docs/architecture.md#phase-35-testing-and-component-documentation) for current testing status (Playwright E2E for critical flows including Tool A, Storybook for UI components)._

### Component Testing
- **React Testing Library**: (Aspirational for wider unit/integration testing beyond Storybook interaction tests).
- **Critical paths**: Prioritize testing critical user flows (Current E2E approach with Playwright, covering Tool A interactions and core app navigation).

### Mock Strategy
- **API mocking**: For Tool A, `/api/advisor` is a live backend call in E2E tests. Unit/component tests for `AdvisorView` might mock this or the fetch call. `src/lib/clinicalEngineService.ts` itself is a mock service.
- **MSW**: (Aspirational) Could be used for more complex mocking scenarios if needed for frontend tests of aspirational tools.

## Documentation

### Code Documentation
- **JSDoc/TSDoc**: Document complex functions and components (As needed).
- **Props documentation**: Document component props (Via TypeScript types).
- **Example usage**: Include examples for complex components (Storybook aims to provide this).

### Component Showcasing
- **Storybook**: Create stories for reusable UI components, including those used in Tool A and placeholder elements for Tools B, D, F. (Partially implemented, see `docs/architecture.md`).

## Internationalization (Aspirational)

_This section is aspirational as no internationalization tools are currently listed in `docs/architecture.md`._

### Translation Strategy
- **i18next**: Use for translations
- **Translation keys**: Organized by feature/component
- **Variable interpolation**: Use for dynamic content
- **Pluralization**: Handle pluralization correctly
- **RTL support**: Support right-to-left languages if required

## Error Handling

### UI Error States
- **Error boundaries**: Use React error boundaries (Good practice, may exist at root).
- **Fallback UIs**: Graceful degradation on errors (e.g., `ErrorDisplay.tsx` component).
- **Retry mechanisms**: Allow users to retry failed operations (Where applicable).
- **Error logging**: Log errors to monitoring service (e.g. Sentry - Aspirational, or via Vercel console).
- **User feedback**: Clear error messages to users (Goal).

### Debugging
- **Error tracking**: Integrate with Sentry or similar service (Aspirational).
- **Error context**: Include relevant context with errors (e.g., `ErrorDisplay.tsx` allows context).
- **Console warnings**: Use development warnings for common mistakes (Default Next.js/React behavior).

## Security Best Practices

### Frontend Security
- **XSS prevention**: Avoid dangerous patterns like `innerHTML`. React helps by default.
- **CSRF protection**: If using custom state-changing API routes with cookies, ensure Next.js built-in or custom protection.
- **Content Security Policy**: Configure appropriate CSP (Aspirational for strict CSP).
- **Sensitive data**: Never store sensitive data in localStorage or client-side unencrypted.
- **Input sanitization**: Sanitize user inputs (Less critical for display, important if re-used in dangerous ways).

## Browser Compatibility

### Support Targets
- **Browser list**: Chrome, Firefox, Safari, Edge (latest 2 versions) - Standard modern browser support.
- **Polyfills**: Include for required features (Next.js handles many).
- **Graceful degradation**: Provide fallbacks for unsupported features (General goal).
- **Testing**: Cross-browser testing for critical features (Aspirational for formal testing).

## Code Quality Tools

### Linting and Formatting
- **ESLint**: Follow project ESLint rules (Current practice).
- **Prettier**: Use for code formatting (Current practice).
- **TypeScript strict mode**: Enable for type safety (Current practice).
- **Pre-commit hooks**: Run linting and testing before commits (e.g. Husky - Aspirational if not set up).

### Pull Request Guidelines
- **PR size**: Keep PRs focused and manageable (General goal).
- **Description**: Clear description of changes (General goal).
- **Screenshots**: Include for UI changes (Good practice).
- **Testing instructions**: How to test the changes (Good practice).
- **Code review**: Required before merging (Assumed practice).