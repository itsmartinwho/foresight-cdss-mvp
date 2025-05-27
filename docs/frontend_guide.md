# Frontend Guide for Foresight CDSS MVP

## Overview
This document establishes frontend development guidelines, styling conventions, and architectural patterns for the Foresight CDSS MVP. It combines and replaces the previous `frontend_guidelines_document.mcd.md` and `frontend-styling-guide.md`.

**The primary source of truth for overall system architecture, AI tool implementation, and backend details remains [./architecture.md](./architecture.md).**

## Current MVP Status & Authoritative Documentation

Key aspects of the current implementation:

1.  The project is a **Next.js 15 / React 19** single-repo front-end. (See `architecture.md` for structure).
2.  **AI Functionality:**
    *   **Tool A (Advisor):** The primary existing AI feature is an OpenAI-powered chatbot in the "Advisor" tab. (See `architecture.md` for details on `/api/advisor`).
    *   **Aspirational AI Tools (B, C, D, F):** Other AI tools like a Diagnosis/Treatment Engine (Tool B), Medical Co-pilot (Tool C), Complex Conditions Alerts (Tool D), and Clinical Trial Matching (Tool F) are aspirational. Placeholder UI elements for some of these exist.
3.  Backend APIs are primarily **Supabase (PostgreSQL)** with custom Next.js API routes. `src/lib/clinicalEngineService.ts` is a mock service for frontend development of aspirational features.
4.  **Storybook** and **Playwright (E2E tests)** are in use.
5.  The design system uses **shadcn/ui** components and custom components in `src/components/ui/`.

Always refer to `architecture.md` for the most current, implemented truth regarding backend, AI tools, and overall system design. Sections below describing features or tools not detailed as "current" in `architecture.md` are likely aspirational or general best practices.

## Code Organization

_For the current project structure and component organization, refer to [./architecture.md#directory-structure-highlights](./architecture.md#directory-structure-highlights) and [./architecture.md#component-architecture](./architecture.md#component-architecture)._

### Project Structure (General Template)
```
/src
├── app/                  # Next.js app directory
│   ├── advisor/          # Contains UI for Tool A (Advisor)
│   ├── consultation/     # Consultation management
│   ├── patients/         # Patient management
│   ├── api/              # API routes (e.g., /api/advisor)
│   └── layout.tsx        # Root layout component
├── components/           # Reusable components
│   ├── views/            # Main view components (e.g., AdvisorView.tsx)
│   ├── ui/               # Basic UI components (shadcn/ui based)
│   ├── layout/           # Layout components (e.g., GlassHeader, ContentSurface)
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers (e.g., supabaseClient.ts, clinicalEngineService.ts - MOCK)
├── types/                # TypeScript type definitions
├── styles/               # Global styles (globals.css)
└── public/               # Static assets
```

### Component Organization
- **One component per file**: Each component in its own file.
- **Co-locate related files**: Keep component-specific styles (if not using Tailwind directly), tests, and stories together where practical.
- **Component naming**: PascalCase for component files and names.
- **Index files**: Use index files for cleaner imports from directories (e.g., `src/components/ui/index.ts` if helpful).

## Coding Standards

### TypeScript
- **Use TypeScript**: All components and functions typed.
- **Avoid `any`**: Use specific types or `unknown`.
- **Use interfaces/types**: For complex object types.
- **Type props**: Always type component props.
- **Export types**: Make types available for reuse.

### React & Components
- **Functional components**: Use functional components with hooks.
- **Custom hooks**: Extract reusable logic into custom hooks (`src/hooks/`).
- **Component size**: Keep components focused on a single responsibility.
- **Props destructuring**: Destructure props in function parameters.
- **Default props**: Use default parameter values for optional props.
- **Prop naming**: Use clear, descriptive prop names.

### File Naming Conventions
- **Component files**: `ComponentName.tsx`
- **Hook files**: `use-hook-name.ts`
- **Utility files**: `descriptive-name.ts`
- **Test files**: `ComponentName.test.tsx` or `ComponentName.spec.tsx` (Jest/RTL), `*.spec.ts` (Playwright), `*.stories.tsx` (Storybook).

## State Management

_Refer to [./architecture.md#ui-patterns-conventions-and-styling](./architecture.md#ui-patterns-conventions-and-styling) (specifically State Management subsection) for current practices (React state/Context, `ForesightApp.tsx` for app-level state)._

### Local State
- **`useState`**: For simple component-level state.
- **`useReducer`**: For complex component-level state.

### Global State
- **React Context**: For shared state across components (Primary current method, e.g. in `ForesightApp.tsx`).
- **SWR/React Query**: Considered/aspirational for server state and caching beyond Supabase client capabilities.
- **Zustand**: Aspirational for very complex global state needs.

### Data Fetching
- **Primary Method**: `supabaseDataService.ts` or direct Supabase client calls. Standard `fetch` for `/api/advisor`.
- **Loading states**: Always handle loading states.
- **Error handling**: Always handle error states (e.g. `ErrorDisplay.tsx`).

## Styling & UI Conventions

### Icon Library
- The application uses Phosphor Icons (`@phosphor-icons/react`) for all iconography. Icons should be imported from `@phosphor-icons/react`.
  ```tsx
  import { MagnifyingGlass as Search, House as Home } from '@phosphor-icons/react';
  ```
- Avoid using `lucide-react`.

### Core Principle for Inputs/Placeholders
1.  **Placeholder State:** When a field is empty/unselected, its placeholder text should appear "paler" (medium gray, slightly transparent), use a standard smaller font size (`text-step--1`), and a light font weight.
2.  **User Input State:** Once a user types or selects a value, the text should switch to the standard input text style: darker (default foreground color) and fully opaque, using the same `text-step--1` font size.

### Key CSS Variables and Tailwind Setup (`src/app/globals.css`)
*   `--placeholder-color: #94a3b8;` (Tailwind's `slate-400`)
*   `--placeholder-opacity: 0.6;`
*   `--step--1: clamp(.75rem, .72rem + 0.15vw, .84rem);` (Standard smaller font size)
*   `.text-step--1`: Utility class applying `font-size: var(--step--1); line-height: 1.5; font-weight: 300;`.

**Core Accent Colors (as of recent UI update):**
*   **Primary Accent:** `--custom-blue-teal` (HSL `209 70% 46%` / Hex `#256D9C`). This is aliased via `--neon-val` and used for global `--accent` and `--ring` variables.
*   **Secondary Accent:** White (`#FFFFFF` / HSL `0 0% 100%`). Used in combination with the primary accent, especially in gradients.

### Styling by Component Type

#### 1. Standard Text Inputs (Shadcn/ui `<Input>`)
*   **Class Name:** `className="text-step--1 font-sans ..."`
*   **Placeholder Styling:** Globally handled in `globals.css`:
    ```css
    input::placeholder, textarea::placeholder {
      color: var(--placeholder-color) !important;
      opacity: var(--placeholder-opacity) !important;
      font-size: var(--step--1) !important;
      font-weight: 300 !important;
      font-family: inherit !important;
    }
    ```

#### 2. Select Dropdowns (native `<select>`)
*   **Base Class Name:** `className="text-step--1 font-sans ..."`
*   **Conditional Styling (using `cn()` utility):**
    *   No Value Selected: `text-[var(--placeholder-color)] opacity-[var(--placeholder-opacity)]`
    *   Value Selected: `text-foreground opacity-100`
*   **Global CSS for robust select styling (`globals.css`):**
    ```css
    select[value=""] { /* Unselected placeholder state */
      color: var(--placeholder-color) !important;
      opacity: var(--placeholder-opacity) !important;
    }
    select[value]:not([value=""]) { /* Selected value state */
      color: hsl(var(--foreground)) !important;
      opacity: 1 !important;
    }
    ```

#### 3. Custom Date/Time Picker (`StyledDatePicker`)
*   Internal `<input>` styled with `text-step--1 font-sans`.
*   Placeholder styled by global `input::placeholder` rules.
*   Z-index for popups managed (e.g., `popperClassName="z-[60]"`, global CSS for time picker z-index).

### Advisor Chat Input/Footer (Fixed to Viewport)
*   Implemented as a floating, glassmorphic input bar anchored to the bottom of the viewport.
*   Rendered using a React portal (`createPortal`) into `document.body` to ensure `position: fixed` is relative to the viewport.
*   Main application layout's primary content area does not scroll, preventing the fixed element from moving with page content.
*   Chat area has `pb-44` to avoid content being hidden.

### Chat Bubble Styling
*   **User messages**: Translucent neon teal background (`bg-neon/30`), black text (`text-black`).
*   **Assistant messages**: White background, 90% opacity (`bg-white/90`), gray-800 text (`text-gray-800`).
    *   Markdown content within assistant messages is styled using Tailwind's `@tailwindcss/typography` plugin (`prose` and `prose-sm` classes).

### Layout & Containers

#### `ContentSurface` Component (`src/components/layout/ContentSurface.tsx`)
*   All route-level pages render content inside one `<ContentSurface>`.
*   **Default**: Frosted-glass div, `rounded-2xl`, `p-6`, `max-w-screen-xl` (was `max-w-5xl` or `80rem` before, standardized to `screen-xl`).
*   **`fullBleed` prop**: For views needing the entire viewport (e.g., complex workspaces), renders a plain flex column without glass styling.
*   Avoid nesting glass surfaces.

#### Navbar Search Bar
*   Horizontally centered, `max-w-5xl`.
*   Uses `unified-search-input` class with `placeholder:text-[#F0F0F0] placeholder:opacity-75` for light placeholder on dark navbar.

#### Main View Structure & Scrolling (2024 Refactor)
*   Each main view wrapped in `ContentSurface`.
*   Scrolling handled by an inner `<div className="flex-1 min-h-0 overflow-y-auto">` inside `ContentSurface`.
*   Page itself (`html`, `body`) uses `overflow: hidden`.

### UI Library Policy and Scroll Area Usage
*   **Radix UI**: Primitives in `src/components/ui/` are built on Radix UI (Shadcn UI pattern).
*   **Native Browser Elements**: Preferred for layout, scrolling, and most containers.
*   **Radix `ScrollArea`**: Use **only when strictly necessary** (e.g., custom scrollbars). Document reason if used.
*   **Policy:** Default to native browser scroll areas.

### Standardized Dropdown/Select Menu Styling
*   `DropdownMenuContent` and `SelectContent` styled to match navbar search results panel:
    *   Background/Blur: `backdrop-blur-lg bg-[rgba(255,255,255,0.1)]`
    *   Border: `border-glass` (`border: 1px solid rgba(255,255,255,0.15)`)
    *   Inner Glow (optional): `shadow-inner-glow`

### Button Styles: Primary vs. Secondary

#### Secondary Button (2025 Glassy Gradient Update)
*   **Inside:** Glassy/translucent (`bg-[rgba(255,255,255,0.10)]` light / `bg-[rgba(0,0,0,0.10)]` dark) and `backdrop-blur-sm`.
*   **Border/Edge:** Teal-to-yellow gradient via `before` pseudo-element.
*   **Shine:** Inner shine via `after` pseudo-element.
*   **Hover Animation:** Border spins; inside remains glassy.
*   **Implementation:** `src/components/ui/button.tsx`, `secondary` variant.
*   Primary button remains unchanged.

### Sidebar Styling (`GlassSidebar`)
*   **'Advisor' Link Default:** Black text, animated gradient sheen (black to neon teal `to-teal-300`) via `sheen` class.
*   **'Advisor' Link Active:** Bold black text (`text-black font-semibold`), icon also black.
*   **Icon Default (Zap for Advisor):** `text-black`.

### General Styling Notes
- **Tailwind CSS**: Primary styling tool.
- **Consistency**: Maintain visual consistency using theme variables from `tailwind.config.js`.
- **Mobile-first**: Design for mobile, then enhance for larger screens.
- **Dark mode**: Support dark mode where applicable (aspirational if not fully implemented).

## Forms and Validation

### Form Handling
- **Current Practice**: Standard React state/event handlers. Custom `StyledDatePicker`.
- **Aspirational**: `React Hook Form` for system-wide adoption.

### Validation
- **Current Practice**: Manual validation or simple checks.
- **Aspirational**: `Zod` schemas for system-wide adoption.
- Provide clear, actionable error messages (e.g., `ErrorDisplay.tsx`).

## Performance Optimization

_Refer to [./architecture.md#build-performance-and-deployment-considerations](./architecture.md#build-performance-and-deployment-considerations) for performance notes._

### Component Optimization
- **Memoization**: `React.memo()`, `useCallback/useMemo` where applicable.
- **Virtualization**: For long lists (aspirational).
- **Image optimization**: Next.js `<Image>` component (if used; current app may use `<img>` or CSS backgrounds more).
- **Code splitting**: Dynamic imports for less critical components (Next.js default for pages).

## Accessibility (WCAG 2.1 AA Target)

_Refer to Radix UI documentation for base accessibility of Shadcn/UI components._

### Base Requirements
- **Semantic HTML**: Use appropriate HTML elements.
- **ARIA attributes**: Add where semantic HTML isn't sufficient (Radix provides many).
- **Keyboard navigation**: Ensure all interactions are keyboard accessible.
- **Focus management**: Proper focus handling.

### Implementation Guidelines
- **Color contrast**: Maintain 4.5:1 minimum.
- **Focus styles**: Visible focus indicators.
- **Form labels**: Proper labeling for all form controls.
- **Alternative text**: For all meaningful images.

## Testing

_Refer to [./development_guide.md#testing-standards](./development_guide.md#testing-standards) for the comprehensive testing strategy._

- **Component Testing**: Storybook for UI components. React Testing Library (aspirational for wider unit/integration testing).
- **E2E Testing**: Playwright for critical user flows.
- **Mock Strategy**: `/api/advisor` is live in E2E. `src/lib/clinicalEngineService.ts` is a mock service.

## Documentation

### Code Documentation
- **JSDoc/TSDoc**: Document complex functions and components.
- **Props documentation**: Via TypeScript types.
- **Example usage**: In Storybook.

### Component Showcasing
- **Storybook**: Create stories for reusable UI components.

## Internationalization (Aspirational)
- No internationalization tools currently listed in `architecture.md`.

## Error Handling

### UI Error States
- **Error boundaries**: Use React error boundaries.
- **Fallback UIs**: Graceful degradation (e.g., `ErrorDisplay.tsx`).
- **User feedback**: Clear error messages.

## Security Best Practices

### Frontend Security
- **XSS prevention**: React helps by default. Avoid `innerHTML`.
- **CSRF protection**: Ensure protection if using custom state-changing API routes with cookies.
- **Sensitive data**: Never store unencrypted sensitive data in localStorage.

## Browser Compatibility
- **Support Targets**: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions).

## Code Quality Tools
- **ESLint & Prettier**: Enforce project rules.
- **TypeScript strict mode**: Enabled. 