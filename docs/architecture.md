# Frontend Architecture

> **Cross-reference:**
> - This file, [../.cursor/rules/python.md](../.cursor/rules/python.md), and [../clinical_engine.py](../clinical_engine.py) must be kept in sync regarding the vision, status, and integration plans for Tool B (Diagnosis and Treatment Engine).
> - If the product vision or prototype logic for Tool B changes, update all three to avoid documentation drift.

## Overview

This document outlines the frontend architecture of the Foresight CDSS MVP prototype, focusing on the Next.js (App Router) implementation. The architecture prioritizes modularity, clear separation of concerns, and maintainability.

The application features several AI-powered clinical tools:
*   **Tool A (Advisor):** Currently implemented as an AI-powered chatbot in the "Advisor" tab, using OpenAI via the `/api/advisor` route. It provides general medical information.
*   **Tool B (Diagnosis and Treatment Engine):** An aspirational feature. Aims to ingest patient data and consultation transcripts to produce diagnoses and treatment plans, and generate related documents (referrals, prior authorizations). Placeholder UI elements for these outputs exist. The `clinical_engine.py` script is a very early prototype for this engine's logic and is not currently integrated.
*   **Tool C (Medical Co-pilot):** An aspirational, real-time AI assistant to provide nudges to physicians during consultations. Does not yet exist.
*   **Tool D (Complex Conditions Alerts):** An aspirational tool to scan diagnostic outputs (from the future Tool B) and alert physicians to potential complex conditions. Placeholder UI for alerts exists, currently populated by mock data from the `patients.alerts` field in Supabase.
*   **Tool F (Clinical Trial Matching):** An aspirational tool to find clinical trials for eligible patients. Placeholder UI for clinical trials exists, currently populated by mock data.

## Core Principles

*   **Component-Based Design:** The UI is built using React components, promoting reusability and encapsulation.
*   **Centralized Routing Logic:** A main application component (`ForesightApp.tsx`) handles the display of different views based on the current URL pathname.
*   **Global Layout:** Consistent UI elements like the header and sidebar are managed at the root layout level. Starting with the May-2025 flattening refactor, each route now renders its main content inside a single `ContentSurface` component which provides a frosted-glass backdrop and consistent padding. Pages that need the full viewport (e.g. `PatientWorkspaceView`) may pass `fullBleed` to opt out of the glass wrapper.
*   **Styling:** Tailwind CSS is the primary utility for styling, supplemented by global styles and potentially CSS Modules for component-specific styles.
*   **Logging Strategy:** The `SupabaseDataService` uses concise `Prod Debug` logs via `console.log` for key data-loading events (e.g., load in progress, initiating sequence, fetching patients, fetching visits). Row-level verbose logs have been removed for clarity; errors and warnings remain enabled. The `/api/advisor` route also includes error logging.

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
    *   `supabaseClient.ts`: Initializes the Supabase client.
    *   `supabaseDataService.ts`: Provides methods for interacting with Supabase.
    *   `clinicalEngineService.ts`: **Important:** This service (`src/lib/clinicalEngineService.ts`) is a **mock/simulation service** primarily for frontend development and does **not** power the live Advisor (Tool A). Its methods simulate responses that would be expected from the future Tool B (Diagnosis and Treatment Engine) and Tool F (Clinical Trial Matching), aligning with the capabilities envisioned for `clinical_engine.py`. It is not connected to any live backend AI engine.
    *   `alertService.ts`: Contains initial concepts for alert generation, potentially related to the future Tool D.
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
*   Global states (like `activePatient`, `selectedPatientTab`) and their associated handlers are managed within `ForesightApp.tsx`. It also centrally fetches and processes `complexCaseAlerts` (sourced from the `alerts` field of patient data in Supabase). This `alerts` data currently serves as **mock/placeholder data** for what the aspirational **Tool D (Complex Conditions Alerts)** will eventually generate more intelligently. These alerts are then passed down to relevant views like `DashboardView` and `AlertsScreenView`.

### 3. View Components (`src/components/views/`)

*   These components represent the main content for different sections of the application.
    *   Examples: `DashboardView.tsx`, `PatientsListView.tsx`, `PatientWorkspaceView.tsx`, `AlertsScreenView.tsx`, `AnalyticsScreenView.tsx`, `SettingsScreenView.tsx`, `AdvisorView.tsx`.
*   For detailed styling, layout, and scrolling patterns (e.g., usage of `ContentSurface`, chat input in `AdvisorView`), refer to the [Frontend Styling Guide](docs/frontend-styling-guide.md).
*   View components are responsible for their specific UI and interactions.
    *   `AdvisorView.tsx` implements the UI for **Tool A (Advisor)**, interacting with the `/api/advisor` backend endpoint. It includes UI elements for model switching, file uploads, dictation, and voice mode (though some of these may have buggy functionality as per user feedback).
    *   Components like `PatientWorkspaceView.tsx` or dedicated modal/form components may contain **placeholder UI fields** for displaying outputs from the aspirational **Tool B** (e.g., diagnosis, treatment plan sections, prior authorization forms, referral forms). These fields currently hold mock data or are empty.
    *   `AlertsScreenView.tsx` and `DashboardView.tsx` display alerts. These are currently mock alerts but represent where **Tool D** outputs would be shown.
    *   `PatientWorkspaceView.tsx` (or a dedicated section) may contain placeholder UI for **Tool F** (Clinical Trial Matching), currently showing mock data.
*   Data fetching is increasingly centralized or handled by dedicated services. For instance, `DashboardView` and `AlertsScreenView` now receive shared alert data as props from `ForesightApp.tsx`.
    *   The Advisor chat (**Tool A**) calls a dedicated OpenAI proxy endpoint at `/api/advisor` which streams/composes responses from GPT-4.1, optionally switching to GPT-3.5 for the "Think harder" mode.

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
    *   `patients`: Stores patient demographic data, **alerts (currently mock/placeholder data for the aspirational Tool D)**, primary diagnosis, and other patient-specific information. Each patient has a unique `patient_id` (original identifier) and an internal Supabase `id` (UUID).
    *   `visits`: Contains information about patient admissions or consultations, including types, dates, reasons, and associated notes or treatments.
    *   `transcripts`: Intended for storing detailed or versioned transcripts from consultations, which would be a key input for the aspirational **Tool B (Diagnosis and Treatment Engine)**. (Currently, simpler transcript/note fields might exist directly in `visits`).
*   **Data Interaction:** Data is primarily fetched from and manipulated in Supabase. The application uses `src/lib/supabaseClient.ts` to create a Supabase client and `src/lib/supabaseDataService.ts` (or direct client usage in server components/API routes) for querying the database.
*   **No Local Mock Data Files:** The system does not rely on local flat files (like TSV or JSON in the `public/` directory) for its primary data source anymore. All patient and clinical data comes from the Supabase backend. The `clinical_engine.py` (prototype for Tool B) might use local files for its standalone development.

### API Layer
*   **Supabase Auto-generated APIs:** Supabase provides RESTful and GraphQL APIs for database tables by default, which can be used for data operations.
*   **Custom API Routes:** The Next.js application also defines custom API routes under `src/app/api/`.
    *   `/api/advisor`: This route serves **Tool A (Advisor)**. It acts as a proxy to OpenAI, taking user messages and an optional model preference, adding a system prompt, and streaming responses back from the OpenAI Chat Completions API.
*   **`clinical_engine.py` (Standalone Prototype for Tool B):** The Python script `clinical_engine.py` is a standalone, very early prototype exploring logic for the aspirational **Tool B (Diagnosis and Treatment Engine)**. It is **not currently integrated** into the Next.js application or called by any API route. If Tool B were to be developed further using this Python base, it would likely be containerized and exposed via its own API, or its logic would be translated to TypeScript/JavaScript and integrated into the Next.js backend.
*   **`src/lib/clinicalEngineService.ts` (Mock Service):** As stated in the Directory Structure Highlights, this TypeScript service is a **collection of frontend mocks/simulations**. It does **not** connect to `clinical_engine.py` or any live AI backend. Its methods (e.g., `generateDiagnosticPlan`, `matchClinicalTrials`) simulate the kinds of responses and data structures that would be expected from the future Tool B and Tool F. This is useful for frontend development and UI prototyping in the absence of the actual backend logic for those features.

## Target State Considerations

The architecture is designed with the following future AI-powered capabilities in mind, building upon the existing Advisor (Tool A) and Supabase backend:

*   **Tool A (Advisor) Enhancements:**
    *   Ability to attach specific patient information as context to the Advisor chat. This would likely involve modifying the `/api/advisor` route to accept a patient ID, fetch relevant data from Supabase, and incorporate it into the prompt sent to OpenAI.
    *   Improving the reliability and functionality of existing UI features like model switching, paper search, file uploads, dictation, and voice mode.

*   **Tool B (Diagnosis and Treatment Engine):** This is a major aspirational feature.
    *   **Inputs:** Pre-existing patient information (from Supabase `patients` and `visits` tables), and the transcript from the just-ended consultation (potentially from the `transcripts` table or directly from the consultation UI).
    *   **Process:** A sophisticated clinical reasoning engine. It would first create a diagnostic plan with various workstreams, execute these in parallel (potentially involving further data lookups or sub-analyses), and then contrast, compare, verify, and synthesize the results.
    *   **Outputs:** A structured diagnosis and treatment plan, which the physician can review, amend, and accept. Upon acceptance, it could trigger the creation of other objects like filled-out referral forms and prior authorization forms. Placeholder UI for these outputs already exists.
    *   **Future Enhancement:** Parse novel clinical research (academic papers) from the internet to inform its diagnosis and treatment recommendations.
    *   **Prototyping:** The `clinical_engine.py` script serves as an initial, standalone prototype for the logic of this engine. Future development might involve evolving this Python code and exposing it via an API, or re-implementing the logic in TypeScript within the Next.js backend.

*   **Tool C (Medical Co-pilot):** A real-time AI assistant during live consultations.
    *   **Functionality:** Listens to the consultation in real-time and provides discrete, high-confidence nudges (e.g., silent notifications) to the physician about questions to ask, tests to consider, etc., if it detects potential omissions.
    *   **Technology:** Would likely require real-time audio processing, speech-to-text, and a fast, responsive AI model. Integration might involve WebSockets or similar real-time communication.

*   **Tool D (Complex Conditions Alerts):** An advanced alerting system.
    *   **Functionality:** Passively scans the outputs of the (future) Tool B (Diagnosis and Treatment Engine) to identify patterns indicative of complex conditions that might be hard for some physicians to spot (e.g., early signs of cancer, autoimmune diseases). It would only alert the physician when it has a very high degree of confidence.
    *   **Current State:** Placeholder UI for alerts exists, and the `patients.alerts` field in Supabase is used by `ForesightApp.tsx` to display mock alert data. Tool D would replace this mock data with intelligently generated alerts.

*   **Tool F (Clinical Trial Matching):** An automated tool to find relevant clinical trials.
    *   **Functionality:** For certain diagnoses, specialties, or complex conditions (trigger to be defined), this tool will scan the internet (or dedicated clinical trial databases) for ongoing clinical trials for which a patient might be eligible.
    *   **Current State:** Placeholder UI for clinical trials exists and may display mock data. Tool F would provide the actual matching functionality.

*   **Data Fetching & Real-time Updates:** Advanced tools like Tool C and potentially Tool B (if it involves iterative updates) will require robust mechanisms for real-time data flow (e.g., WebSockets, server-sent events), influencing state management and component design.
*   **Authentication & Authorization:** Secure access to patient data and system features will remain paramount, with existing authentication (likely Supabase Auth) being extended as needed.

This architecture aims to provide a solid foundation for developing these more complex features in the future, leveraging Supabase for data management and Next.js for both frontend and API capabilities, while allowing for integration of specialized AI services or engines as needed.

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
*   Large libraries like `date-fns` (all locales) and `phosphor-react` (all icons): Tree-shaking significantly reduces their size in the final client bundle.

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
*   **Icon Optimization:** The project now uses native imports from `phosphor-react`, which supports tree-shaking via ES modules.
*   **Locale Stripping:** Explore options to remove unused locales from `date-fns` via webpack or Next.js configuration.
*   **Cloudflare Worker Evaluation:** Continue to evaluate if the full Cloudflare Worker build/deployment model is essential for the project's long-term goals or if simpler deployment targets suffice.

## Advisor Tab Model Selection

- The Advisor tab defaults to the `gpt-4.1-mini` model for general queries.
- When the user enables **Think** mode, the model switches to `o3` for more advanced reasoning tasks.

## Advisor Chat Rendering Pipeline

### Backend (API)
- The advisor API route (`/api/advisor/route.ts`) requests responses from OpenAI in strict JSON mode, using a schema that supports paragraphs, lists, tables, and references.
- The response is streamed to the frontend as a JSON object.

### Frontend
- The advisor view (`AdvisorView.tsx`) streams the response, buffering tokens until a valid JSON object is received.
- The JSON is parsed and rendered using React components for each content type (paragraph, bold, italic, lists, tables, references).
- References are interactive: URLs open in a new tab, text references scroll to a footnote section.
- All messages have unique IDs for React key stability.

### Benefits
- Robust against malformed Markdown.
- Secure (no `dangerouslySetInnerHTML`).
- Easily extensible for future content types or UI improvements.

---

> **Cross-reference:**
> - For the standalone Tool B prototype, see [../clinical_engine.py](../clinical_engine.py).
> - For detailed notes on the prototype and its integration, see [../.cursor/rules/python.md](../.cursor/rules/python.md).
> - Keep this file, [../.cursor/rules/python.md](../.cursor/rules/python.md), and [../clinical_engine.py](../clinical_engine.py) in sync regarding Tool B's vision and integration plans.

# System Architecture

This document outlines the architecture of the Foresight CDSS MVP, with a focus on its key components and interactions.

## Core Components

- **Frontend (Next.js/React):** The user interface is built with Next.js and React, providing a responsive and interactive experience for physicians.
- **Backend (Next.js API Routes):** Server-side logic, including LLM interaction, is handled via Next.js API routes.
- **Large Language Model (OpenAI GPT):** The primary AI engine for processing medical queries and generating responses.

## Feature Architectures

### 1. Advisor Chat

The Advisor Chat enables physicians to interact with an AI medical advisor in real-time.

**Workflow:**

1.  **User Input (`src/components/views/AdvisorView.tsx`):**
    *   The user types a query into the chat interface.
    *   On send, the `AdvisorView` component captures the input.

2.  **Payload Construction (`src/components/views/AdvisorView.tsx`):**
    *   A history of messages is constructed for the API. This includes:
        *   Previous user messages (as strings).
        *   The textual content of previous assistant responses. This text is extracted from the `innerText` of the HTML `div` elements that the `streaming-markdown` library populated for each assistant message, or from fallback Markdown content if applicable.
        *   The new user query (as a string).
    *   This message list is JSON stringified and URL-encoded as a `payload` query parameter.

3.  **API Request (SSE) (`src/components/views/AdvisorView.tsx`):**
    *   An `EventSource` connection is established to `/api/advisor?payload=...`.

4.  **Backend Processing (`src/app/api/advisor/route.ts`):**
    *   **Request Handling:** The `GET` handler in the API route receives the request.
    *   **Payload Parsing:** The `payload` is parsed to extract the message history.
    *   **System Prompting:** A system prompt is prepended to the message history. This prompt guides the LLM to act as a medical advisor and to format its responses in GitHub-flavored Markdown suitable for streaming.
    *   **LLM Interaction (`streamMarkdownOnly` function):**
        *   A streaming chat completion request is made to the OpenAI API (e.g., GPT-4.1).
        *   The LLM streams back tokens.
    *   **Server-Side Buffering:** Tokens from the LLM are accumulated in a server-side buffer. This buffer is flushed (sent to the client) when:
        *   A Markdown paragraph boundary (`\n\n`) is detected.
        *   The buffer exceeds a certain length threshold (e.g., 600 characters).
    This strategy ensures that more structurally complete Markdown chunks are sent, reducing the "telegraph-y" effect and preserving formatting integrity.
    *   **SSE Message Sending:** Each flushed buffer content is sent to the client as a JSON object: `data: {"type":"markdown_chunk","content":"..."}\n\n`.
    *   **Stream Termination:** When the LLM finishes, a `data: {"type":"stream_end"}\n\n` message is sent. Errors are sent as `data: {"type":"error","message":"..."}\n\n`.

5.  **Client-Side Rendering (`src/components/views/AdvisorView.tsx` & `streaming-markdown`):**
    *   **New Message Placeholder:** When a user sends a message, an assistant message placeholder is immediately added to the chat UI, and a new `div` is created to host the incoming Markdown.
    *   **Parser Initialization:** An instance of the `streaming-markdown` parser (`smd_parser`) is initialized, configured with a `default_renderer` that targets this new `div`.
    *   **SSE `onmessage` Handler:**
        *   Receives `markdown_chunk` events.
        *   The `content` of each chunk is passed to `smd_parser_write(parserInstance, chunkContent)`. The `streaming-markdown` library parses the Markdown incrementally and appends the corresponding HTML elements to the target `div`.
        *   On `stream_end`, the parser is finalized (`smd_parser_end`), and the message is marked as no longer streaming.
        *   Error events are handled by displaying an error message.
    *   **Dynamic Display:** The `AssistantMessageRenderer` component in `AdvisorView.tsx` ensures that the `div` (populated by `streaming-markdown`) is correctly displayed within the chat message bubble. React's reconciliation handles updating the view as the `div`'s content changes.

**Data Flow Diagram (Simplified):**

```
[User @ AdvisorView.tsx] --(Input)--> [AdvisorView.tsx]
        |
        --(Payload Prep)-->
        |
[EventSource API Call] --(HTTP GET w/ Payload)--> [API Route: /api/advisor/route.ts]
        |
        --(OpenAI Stream Request)--> [OpenAI GPT]
        |
        <--(Token Stream)-- [OpenAI GPT]
        |
[API Route: Buffering] --(SSE: markdown_chunk/stream_end)--> [EventSource @ AdvisorView.tsx]
        |
        --(smd_parser_write)--> [streaming-markdown lib]
        |
        --(DOM Update in target div)--> [React UI]
```

*(Further architectural details for other features will be added as they are developed.)* 