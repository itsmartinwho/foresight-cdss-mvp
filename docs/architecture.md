# Frontend Architecture

## Overview

This document outlines the frontend architecture of the Foresight CDSS MVP prototype, focusing on the Next.js (App Router) implementation. The architecture prioritizes modularity, clear separation of concerns, and maintainability.

## Core Principles

*   **Component-Based Design:** The UI is built using React components, promoting reusability and encapsulation.
*   **Centralized Routing Logic:** A main application component (`ForesightApp.tsx`) handles the display of different views based on the current URL pathname.
*   **Global Layout:** Consistent UI elements like the header and sidebar are managed at the root layout level. Starting with the May-2025 flattening refactor, each route now renders its main content inside a single `ContentSurface` component which provides a frosted-glass backdrop and consistent padding. Pages that need the full viewport (e.g. `PatientWorkspaceView`) may pass `fullBleed` to opt out of the glass wrapper.
*   **Styling:** Tailwind CSS is the primary utility for styling, supplemented by global styles and potentially CSS Modules for component-specific styles.

## Directory Structure Highlights

*   `src/app/`: Contains Next.js App Router specific files, including page entry points and the global layout.
    *   `layout.tsx`: Defines the root layout, including global components like `GlassHeader` and `GlassSidebar`.
    *   `page.tsx`, `patients/page.tsx`, etc.: Entry points for different routes. These typically just render the main application component (e.g. `<ForesightApp />`) which then handles the actual content display based on the route.
*   `src/components/`: Houses all React components.
    *   `ForesightApp.tsx`: A client component that acts as the main view router, determining which specific view component from `src/components/views/` to render based on `usePathname()`.
    *   `layout/`: Components related to the overall page structure (e.g., `GlassHeader.tsx`, `GlassSidebar.tsx`).
    *   `views/`: Components representing distinct screens or major sections of the application (e.g., `DashboardView.tsx`, `PatientsListView.tsx`, `PatientWorkspaceView.tsx`).
    *   `ui/`: Generic, reusable UI elements (e.g., buttons, inputs, cards) potentially from a library like `shadcn/ui` or custom-built.
*   `src/hooks/`: Custom React hooks (if any).
*   `src/lib/`: Utility functions, helper scripts, type definitions.
*   `src/styles/`: Global stylesheets (e.g., `globals.css`).
*   `public/`: Static assets.

## Component Architecture

### 1. Global Layout (`src/app/layout.tsx`)

*   The root layout is responsible for rendering the main HTML structure, including `<body>`.
*   It globally renders `GlassHeader` and `GlassSidebar` which are fixed UI elements.
*   A main content area wraps the `children` prop. Specific layout details, scrolling behavior, and the use of `ContentSurface` are further detailed in the [Frontend Styling Guide](docs/frontend-styling-guide.md).

### 2. View Router (`src/components/ForesightApp.tsx`)

*   This is a crucial client-side component (`"use client";`) located in `src/components/ForesightApp.tsx`.
*   It uses the `usePathname()` hook from `next/navigation` to get the current URL path.
*   Based on the pathname, it conditionally renders the appropriate view component from `src/components/views/`.
    *   Example: If pathname is `/`, render `<DashboardView />`.
    *   Example: If pathname is `/patients`, render `<PatientsListView />`.
    *   Example: If pathname is `/patients/[id]`, render `<PatientWorkspaceView />` (passing the patient ID).
*   Global states (like `activePatient`, `selectedPatientTab`) and their associated handlers are managed within `ForesightApp.tsx`. It also centrally fetches and processes `complexCaseAlerts` (sourced from the `alerts` field of patient data in Supabase) which are then passed down to relevant views like `DashboardView` and `AlertsScreenView`. Future enhancements might involve on-the-fly alert generation (see `src/lib/alertService.ts` for initial concepts).

### 3. View Components (`src/components/views/`)

*   These components represent the main content for different sections of the application.
    *   Examples: `DashboardView.tsx`, `PatientsListView.tsx`, `PatientWorkspaceView.tsx`, `AlertsScreenView.tsx`, `AnalyticsScreenView.tsx`, `SettingsScreenView.tsx`, `AdvisorView.tsx`.
*   For detailed styling, layout, and scrolling patterns (e.g., usage of `ContentSurface`, chat input in `AdvisorView`), refer to the [Frontend Styling Guide](docs/frontend-styling-guide.md).
*   View components are responsible for their specific UI and interactions. Data fetching is increasingly centralized or handled by dedicated services. For instance, `DashboardView` and `AlertsScreenView` now receive shared alert data as props from `ForesightApp.tsx`.
    *   The Advisor chat calls a dedicated OpenAI proxy endpoint at `/api/advisor` which streams/composes responses from GPT-4.1, optionally switching to GPT-3.5 for the "Think harder" mode.

### 4. UI Components (`src/components/ui/`, `src/components/layout/`)

*   These are more granular, reusable components.
*   `layout/` components like `GlassHeader` and `GlassSidebar` define major structural elements.
*   `ui/` components are typically generic building blocks (buttons, inputs, cards, etc.). This directory now also includes shared helper components like `RenderDetailTable.tsx`, `SeverityBadge.tsx`, `LikelihoodBadge.tsx`, `NotificationBell.tsx`, and `AlertSidePanel.tsx` which were extracted from larger components for reusability.

## Routing Strategy

*   The application uses the Next.js App Router.
*   Directory structure within `src/app/` defines routes (e.g., `src/app/patients/` maps to `/patients`).
*   Dynamic routes are supported (e.g., `src/app/patients/[id]/page.tsx` for individual patient views).
*   Page files (`page.tsx`) within these directories act as entry points. In this architecture, they primarily delegate the rendering logic to `src/components/ForesightApp.tsx`.
*   `src/components/ForesightApp.tsx` then inspects the `usePathname()` to determine which *view component* (from `src/components/views/`) to display. This provides a centralized place to manage transitions between the main sections of the application while leveraging Next.js file-system routing for the initial serving.

## UI Patterns, Conventions, and Styling

Detailed information on UI patterns, styling conventions (including glassmorphism, typography, responsiveness, and accessibility), component styling, and layout/scrolling patterns are documented in the [Frontend Styling Guide](docs/frontend-styling-guide.md).

Key architectural aspects related to UI include:
*   **State Management:** Primarily uses React's built-in state (`useState`, `useReducer`) and Context API for global or shared state. `ForesightApp.tsx` is a key location for managing app-level states that affect multiple views.

## UI Library Usage and Scroll Area Policy

The Foresight CDSS frontend uses a **mixed approach** for UI components:

- **Radix UI**: Most generic UI primitives (buttons, dialogs, tooltips, dropdowns, selects, checkboxes, etc.) in `src/components/ui/` are built on top of Radix UI primitives, following the Shadcn UI pattern. This provides robust accessibility and composability for interactive elements.
- **Native Browser Elements**: For layout, scrolling, and most container elements, we prefer native browser elements styled with Tailwind CSS and global CSS. This includes all main content scroll areas, which use `<div className="flex-1 min-h-0 overflow-y-auto">` or similar patterns.
- **Other Libraries**: As of this writing, no other major UI component libraries (e.g., Material UI, Ant Design, Chakra, react-custom-scrollbars, etc.) are in use. If this changes, this section should be updated.

### Scroll Area Policy
- **Default**: All scrollable content areas (e.g., main view panels, workspace content, chat logs) should use native browser scrolling. This is achieved with Tailwind classes like `overflow-y-auto` and is styled globally for consistent appearance (see `src/app/globals.css`).
- **Radix ScrollArea**: The Radix-based `ScrollArea` component exists in `src/components/ui/scroll-area.tsx` and should **only be used when strictly necessary**—for example, if a feature requires custom scrollbars, advanced scroll event handling, or other behaviors not possible with native scroll. In these cases, document the reason for using Radix ScrollArea in the component.
- **Consistency**: This policy avoids the complexity and styling conflicts that can arise from mixing Radix and native scroll areas unpredictably. It also ensures that global scrollbar styles apply everywhere possible.

### Why This Approach?
- **Radix UI** is excellent for accessibility and complex interactive widgets, but its custom scroll area can be difficult to style and may conflict with global scrollbar styles. Native browser scroll areas are simpler, more performant, and easier to style consistently across the app.
- **By default, use native scroll.** Only reach for Radix ScrollArea if you have a clear, documented need.

See also: [Frontend Styling Guide](docs/frontend-styling-guide.md) for implementation details and code examples.

## Backend Architecture and Data Layer

The application utilizes **Supabase** as its primary backend, which provides a managed **PostgreSQL** database instance and auto-generated APIs.

### Data Source
*   **Primary Database:** A PostgreSQL database hosted on Supabase.
*   **Schema Management:** The database schema is defined in `scripts/schema.sql`. This script creates the necessary tables, columns, relationships, and helper functions/triggers. It should be applied to your Supabase project via its SQL editor to set up the database structure.
*   **Key Tables:**
    *   `patients`: Stores patient demographic data, alerts, primary diagnosis, and other patient-specific information. Each patient has a unique `patient_id` (original identifier) and an internal Supabase `id` (UUID).
    *   `visits`: Contains information about patient admissions or consultations, including types, dates, reasons, and associated notes or treatments. Each visit is linked to a patient via `patient_supabase_id` and has an `admission_id`.
    *   `transcripts`: Intended for storing detailed or versioned transcripts, linked to the `visits` table. (Currently, simpler transcript/note fields might exist directly in `visits`).
*   **Data Interaction:** Data is primarily fetched from and manipulated in Supabase. The application uses `src/lib/supabaseClient.ts` to create a Supabase client and `src/lib/supabaseDataService.ts` (or direct client usage in server components/API routes) for querying the database.
*   **No Local Mock Data Files:** The system does not rely on local flat files (like TSV or JSON in the `public/` directory) for its primary data source anymore. All patient and clinical data comes from the Supabase backend.

### API Layer
*   **Supabase Auto-generated APIs:** Supabase provides RESTful and GraphQL APIs for database tables by default, which can be used for data operations.
*   **Custom API Routes:** The Next.js application also defines custom API routes under `src/app/api/` (e.g., `/api/advisor`) for specific backend logic, such as proxying requests to third-party services (like OpenAI) or performing more complex operations not directly mapped to a simple CRUD operation on a single table.

## Target State Considerations

While the current MVP focuses on the UI shell and mock data, the architecture is designed with the following future capabilities in mind:

*   **Data Fetching:** View components (or dedicated data-fetching hooks/components) will integrate with backend APIs or services (e.g., EHRs, transcription services, AI engines).
*   **Real-time Updates:** Features like the clinical co-pilot and complex case alerting will require mechanisms for real-time data flow (e.g., WebSockets, server-sent events), which may influence state management and component design.
*   **Authentication & Authorization:** Secure access to patient data and system features will necessitate an authentication layer, likely managed globally and impacting routing and data access.

This architecture aims to provide a solid foundation for developing these more complex features in the future.

## Phase 3.5: Testing and Component Documentation

*  **E2E Tests Updated:** Playwright E2E tests now verify the header logo via its alt text (`Foresight Logo`), and sidebar collapse/expand via updated ARIA labels (`Minimize menu` / `Maximize menu`) and Tailwind width classes (`w-56` / `w-[4.5rem]`).
*  **Storybook Stories:** Key UI components now have Storybook stories to facilitate visual testing and documentation. These include:
   *  `SeverityBadge` (Low / Medium / High states)
   *  `LikelihoodBadge` (levels 0 through 5+)
   *  `NotificationBell` (with and without notification counts)
   *  `ErrorDisplay` (with and without context)
   *  `AlertSidePanel` (open and closed states with sample alerts)
   *  `RenderDetailTable` (with sample data arrays)
*  **Type Safety Improvements:** The `Patient` type now mandates `firstName` and `lastName`, and service methods use explicit payload interfaces (`PatientDataPayload`). Web Speech API events in `AdvisorView.tsx` are typed locally, reducing use of `any`.
*  **Next Steps:** Ensure coverage of workspace tab components in Storybook, and expand E2E tests for additional views (Patients list, Patient Workspace, Alerts page) as the application grows.

## Build, Performance, and Deployment Considerations

This section covers aspects related to the project's build process, performance optimizations, and deployment, particularly concerning dependency management and Cloudflare.

### Dependency Management & `node_modules`

The project utilizes `pnpm` for package management. The `node_modules` directory can be large (several hundred MB) due to development-time dependencies that include pre-compiled binaries. Key contributors include:
*   `next` and its SWC compiler: Essential for the Next.js framework.
*   `@cloudflare/workerd`: Required for previewing and building Cloudflare Worker bundles.
*   Large libraries like `date-fns` (all locales) and `lucide-react` (all icons): Tree-shaking significantly reduces their size in the final client bundle.

These development dependencies do not impact the size of the production client bundles, which are typically small.

### Build Scripts & Cloudflare

*   Standard `pnpm run build` (`next build`) is generally fast.
*   Scripts involving Cloudflare, such as `pnpm run preview` or `pnpm run build:worker`, use `opennextjs-cloudflare`. These can be slower and produce larger outputs as they bundle the application for the Cloudflare Workers environment.

### Performance & Optimization Tips

1.  **Dependency Caching:**
    *   **CI (GitHub Actions):** PNPM caching should be enabled (e.g., using `pnpm/action-setup` with `cache: true`).
    *   **Local:** PNPM automatically caches packages globally (e.g., `~/Library/pnpm/store`). Use `pnpm store prune` to remove old versions.
2.  **Selective Builds:** Avoid running full Cloudflare worker builds (`pnpm run preview`) during general development if not specifically testing worker functionality. Standard `pnpm dev` and `pnpm build` are usually sufficient.

### Future Performance Enhancements (Potential)

*   **Lazy Loading:** Investigate dynamic imports for heavy libraries like `recharts` to load them only on relevant pages.
*   **Icon Optimization:** Consider migrating `lucide-react` to native imports if further optimization is needed.
*   **Locale Stripping:** Explore options to remove unused locales from `date-fns` via webpack or Next.js configuration.
*   **Cloudflare Worker Evaluation:** Continue to evaluate if the full Cloudflare Worker build/deployment model is essential for the project's long-term goals or if simpler deployment targets suffice. 