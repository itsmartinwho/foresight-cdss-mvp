# Frontend Architecture

## Overview

This document outlines the frontend architecture of the Foresight CDSS MVP prototype, focusing on the Next.js (App Router) implementation. The architecture prioritizes modularity, clear separation of concerns, and maintainability.

## Core Principles

*   **Component-Based Design:** The UI is built using React components, promoting reusability and encapsulation.
*   **Centralized Routing Logic:** A main application component (`ForesightApp.tsx`) handles the display of different views based on the current URL pathname.
*   **Global Layout:** Consistent UI elements like the header and sidebar are managed at the root layout level.
*   **Styling:** Tailwind CSS is the primary utility for styling, supplemented by global styles and potentially CSS Modules for component-specific styles.

## Directory Structure Highlights

*   `src/app/`: Contains Next.js App Router specific files, including page entry points and the global layout.
    *   `layout.tsx`: Defines the root layout, including global components like `GlassHeader` and `GlassSidebar`.
    *   `ForesightApp.tsx`: A client component that acts as the main view router, determining which specific view to render based on `usePathname()`.
    *   `page.tsx`, `patients/page.tsx`, etc.: Entry points for different routes. These typically just render `<ForesightApp />` which then handles the actual content display.
*   `src/components/`: Houses all React components.
    *   `layout/`: Components related to the overall page structure (e.g., `GlassHeader.tsx`, `GlassSidebar.tsx`).
    *   `views/`: Components representing distinct screens or major sections of the application (e.g., `DashboardView.tsx`, `PatientsListView.tsx`, `PatientWorkspaceView.tsx`). `PatientWorkspaceView.tsx` further encapsulates its tabbed content and helper components.
    *   `ui/`: Generic, reusable UI elements (e.g., buttons, inputs, cards) potentially from a library like `shadcn/ui` or custom-built.
*   `src/hooks/`: Custom React hooks (if any).
*   `src/lib/`: Utility functions, helper scripts, type definitions.
*   `src/styles/`: Global stylesheets (e.g., `globals.css`).
*   `public/`: Static assets, including mock data in `public/data/`.

## Component Architecture

### 1. Global Layout (`src/app/layout.tsx`)

*   The root layout is responsible for rendering the main HTML structure, including `<body>`.
*   It globally renders `GlassHeader` and `GlassSidebar` which are fixed UI elements.
*   A main content area with appropriate padding (to account for the fixed header and sidebar) wraps the `children` prop (which represents the content of the current page/route).

### 2. View Router (`src/app/ForesightApp.tsx`)

*   This is a crucial client-side component (`"use client";`).
*   It uses the `usePathname()` hook from `next/navigation` to get the current URL path.
*   Based on the pathname, it conditionally renders the appropriate view component from `src/components/views/`.
    *   Example: If pathname is `/`, render `<DashboardView />`.
    *   Example: If pathname is `/patients`, render `<PatientsListView />`.
    *   Example: If pathname is `/patients/[id]`, render `<PatientWorkspaceView />` (passing the patient ID).
*   Global states (like `activePatient`, `complexCaseAlerts`, `isAlertPanelOpen`) and their associated handlers are managed within `ForesightApp.tsx` if they are needed by multiple views or for global UI elements (like an alert panel that might overlay any view).

### 3. View Components (`src/components/views/`)

*   These components represent the main content for different sections of the application.
*   Examples:
    *   `DashboardView.tsx`
    *   `PatientsListView.tsx`
    *   `PatientWorkspaceView.tsx` (itself containing sub-components for demographics, admissions, etc.)
    *   `AlertsScreenView.tsx`
    *   `AnalyticsScreenView.tsx`
    *   `SettingsScreenView.tsx`
*   View components are responsible for fetching or receiving their specific data (currently from mock sources, often passed down from `ForesightApp.tsx` or loaded directly if view-specific) and rendering the appropriate UI.

### 4. UI Components (`src/components/ui/`, `src/components/layout/`)

*   These are more granular, reusable components.
*   `layout/` components like `GlassHeader` and `GlassSidebar` define major structural elements.
*   `ui/` components are typically generic building blocks (buttons, inputs, cards, etc.).

## Routing Strategy

*   The application uses the Next.js App Router.
*   Directory structure within `src/app/` defines routes (e.g., `src/app/patients/` maps to `/patients`).
*   Dynamic routes are supported (e.g., `src/app/patients/[id]/page.tsx` for individual patient views).
*   Page files (`page.tsx`) within these directories act as entry points. In this architecture, they primarily delegate the rendering logic to `<ForesightApp />`.
*   `<ForesightApp />` then inspects the `usePathname()` to determine which *view component* (from `src/components/views/`) to display. This provides a centralized place to manage transitions between the main sections of the application while leveraging Next.js file-system routing for the initial serving.

## UI Patterns & Conventions

*   **Typography:** (Details to be filled in if a specific typography scale is defined, e.g., from Tailwind config or global CSS).
*   **Glassmorphism:** Key layout elements like the header and sidebar utilize a "glassmorphism" effect, typically achieved with CSS `backdrop-filter: blur()` and semi-transparent backgrounds. Specific classes for this (e.g., `bg-glass`) should be consistently applied.
*   **State Management:** Primarily uses React's built-in state (`useState`, `useReducer`) and Context API for global or shared state. `ForesightApp.tsx` is a key location for managing app-level states that affect multiple views.
*   **Responsiveness:** Components should be designed to adapt to various screen sizes, primarily using Tailwind CSS's responsive prefixes (sm, md, lg, xl).
*   **Accessibility:** Standard accessibility practices (semantic HTML, ARIA attributes where necessary) should be followed.

## Target State Considerations

While the current MVP focuses on the UI shell and mock data, the architecture is designed with the following future capabilities in mind:

*   **Data Fetching:** View components (or dedicated data-fetching hooks/components) will integrate with backend APIs or services (e.g., EHRs, transcription services, AI engines).
*   **Real-time Updates:** Features like the clinical co-pilot and complex case alerting will require mechanisms for real-time data flow (e.g., WebSockets, server-sent events), which may influence state management and component design.
*   **Authentication & Authorization:** Secure access to patient data and system features will necessitate an authentication layer, likely managed globally and impacting routing and data access.

This architecture aims to provide a solid foundation for developing these more complex features in the future. 