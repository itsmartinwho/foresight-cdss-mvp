# Foresight CDSS System Architecture

> **Cross-reference:**
> - This document is the primary source of truth for the Foresight CDSS architecture, including AI tools, data layer, application flow, and tech stack.
> - For detailed frontend conventions and styling, see [./frontend_guide.md](./frontend_guide.md).
> - For development process, coding standards, and testing strategy, see [./development_guide.md](./development_guide.md).
> - This file and [../src/clinical_engine_prototype/engine.py](../src/clinical_engine_prototype/engine.py) must be kept in sync regarding the vision, status, and integration plans for Tool B (Diagnosis and Treatment Engine).

## Overview

This document outlines the comprehensive architecture of the Foresight CDSS MVP prototype. The system is designed with modularity, clear separation of concerns, and maintainability in mind, supporting both current functionality and future aspirations.

The application features several AI-powered clinical tools:
*   **Tool A (Advisor):** Currently implemented as an AI-powered chatbot in the "Advisor" tab, using OpenAI via the `/api/advisor` route. It provides general medical information.
*   **Tool B (Diagnosis and Treatment Engine):** An aspirational feature. Aims to ingest patient data and consultation transcripts to produce diagnoses and treatment plans, and generate related documents (referrals, prior authorizations). Placeholder UI elements for these outputs exist. The `src/clinical_engine_prototype/engine.py` script is an early prototype for this engine's logic and is not currently integrated.
*   **Tool C (Medical Co-pilot):** An aspirational, real-time AI assistant to provide nudges to physicians during consultations. Does not yet exist.
*   **Tool D (Complex Conditions Alerts):** An aspirational tool to scan diagnostic outputs (from the future Tool B) and alert physicians to potential complex conditions. Placeholder UI for alerts exists, currently populated by mock data from the `patients.alerts` field in Supabase.
*   **Tool F (Clinical Trial Matching):** An aspirational tool to find clinical trials for eligible patients. Placeholder UI for clinical trials exists, currently populated by mock data.

## User Roles & Application Flow

### User Roles
- **Clinicians**: Primary users who consult the system for AI-powered advice (Tool A), patient management, and in the future, for advanced decision support (Tools B, C, D, F).
- **Administrators**: (Aspirational) Users who manage system settings and user accounts.
- **Support Staff**: (Aspirational) Users who assist with patient information and administrative tasks.

### Core Workflows & Screen Flows

_The application flow centers around clinician interaction with patient data and AI tools._

1.  **Authentication Flow (Standard)**
    `Login Screen → Authentication → Dashboard`
    - User enters credentials, system validates, redirects to dashboard or shows error.

2.  **Patient Management Flow (Current)**
    `Dashboard → Patient List → Patient Search → Patient Details → Edit Patient / Add New Patient`
    - Browse, search, view, and manage patient records.

3.  **Consultation Data Entry/Review Flow (Current - Basic; Aspirational - Detailed for Tool B)**
    `Patient Details → New Consultation (Modal) → Input Basic Encounter Information → Save`
    - Current: Input basic encounter information.
    - Aspirational (for Tool B): Capture detailed consultation transcript.

4.  **Tool A: Advisor (AI Chatbot - Current)**
    `Select "Advisor" Tab → Type Question / Use Voice Input / Upload File → Receive AI-Generated Answer (Streamed)`
    - User interacts with AI chatbot in `AdvisorView.tsx` via `/api/advisor`.
    - Optional features: model switching, paper search (may be buggy).
    - Future: Attach specific patient context.

5.  **Tool B: Diagnosis and Treatment Engine (Aspirational - Placeholder UI Exists)**
    `Consultation Ends → Trigger Tool B Analysis (Aspirational) → Physician Reviews/Amends AI Output (in placeholder UI) → Accept Plan → Optionally Generate Documents (placeholder forms)`
    - `src/clinical_engine_prototype/engine.py` prototypes this logic.

6.  **Tool C: Medical Co-pilot (Aspirational - No UI Exists)**
    `During Live Consultation → AI Co-pilot Monitors → Delivers Discrete Nudges/Notifications`

7.  **Tool D: Complex Conditions Alerts (Aspirational - Placeholder UI & Mock Data Exist)**
    `Tool B Completes Diagnosis (Aspirational) → Tool D Scans Output → Alert Appears (Dashboard, Patient Profile, Alerts Screen - replacing current mock alerts)`

8.  **Tool F: Clinical Trial Matching (Aspirational - Placeholder UI & Mock Data Exist)**
    `Diagnosis Finalized → Tool F Scans for Trials (Aspirational) → Matching Trials Displayed (replacing mock data)`

9.  **Reporting/Analytics Flow (Current - Basic; Aspirational - Advanced)**
    `Dashboard → Analytics Screen (AnalyticsScreenView.tsx) → View Basic Charts/Metrics`

### Screen-by-Screen AI Tool Relevance
*   **Dashboard (`DashboardView.tsx`):** Placeholder for Tool D alerts.
*   **Patient Management (`PatientsListView.tsx`, `PatientWorkspaceView.tsx`):**
    *   `PatientWorkspaceView.tsx`: Placeholders for Tool B (Diagnosis/Treatment, documents), Tool F (Clinical Trials), Tool D (Alerts).
*   **Consultation Screens:** Forms capture data (Aspirational: detailed transcript for Tool B).
*   **Advisor Screen (`AdvisorView.tsx`):** Tool A interface.
*   **Alerts Screen (`AlertsScreenView.tsx`):** Placeholder for Tool D alerts.

## Tech Stack

_This section outlines technologies for current and aspirational components._

### Frontend Stack (Current & Aspirational)
*   **Core (Current):** React, TypeScript, Next.js (App Router).
*   **UI & Styling (Current):** Tailwind CSS, Shadcn/UI, Custom Components.
*   **State Management (Current):** React Context API / `useState` / `useReducer` (e.g., in `ForesightApp.tsx`). Aspirational: SWR/React Query, Zustand.
*   **Visualization (Aspirational):** Recharts, D3.js.
*   **Testing (Current):** Playwright (E2E for Tool A), Storybook (UI components). Aspirational: Jest & React Testing Library, MSW.

### Backend Stack

#### Current Implemented Backend
*   **Primary Platform:** Supabase (PostgreSQL) - provides database, auto-generated REST/GraphQL APIs, authentication, storage.
*   **Custom Logic:** Next.js API Routes (e.g., `/api/advisor` for Tool A, proxies to OpenAI).

#### AI Tools - Specific Technologies
*   **Tool A (Advisor) - Current:**
    *   Next.js API route (`/api/advisor`).
    *   Integrates with OpenAI API (GPT-4.1, GPT-3.5).
*   **Tool B (Diagnosis and Treatment Engine) - Aspirational (Python Prototype Exists):**
    *   **Prototype:** `src/clinical_engine_prototype/engine.py` (Python, Pydantic). See dedicated section below.
    *   **Potential Future Stack:** Evolve Python prototype (FastAPI/Flask containerized service), or TypeScript/Node.js rewrite. May incorporate ML models, NLP libraries.
*   **Tool C (Medical Co-pilot) - Aspirational:** Real-time audio processing, Speech-to-Text, fast AI models, WebSockets.
*   **Tool D (Complex Conditions Alerts) - Aspirational:** Processes Tool B outputs, may use ML models.
*   **Tool F (Clinical Trial Matching) - Aspirational:** Web scraping/API integration with clinical trial databases.

#### Aspirational Custom Backend (If Supabase/Next.js APIs are outgrown)
*   **Node.js with Express.js/NestJS:** For custom microservices.
*   **Database:** PostgreSQL (as with Supabase), potentially Prisma ORM.
*   **Caching:** Redis.

### DevOps & Infrastructure
*   **Development (Current):** pnpm, ESLint, Prettier.
*   **CI/CD (Current):** GitHub Actions.
*   **Deployment & Hosting (Current):** Vercel/Netlify (frontend), Supabase (backend).
*   **Aspirational:** Docker, Kubernetes/Serverless for AI services, Terraform.
*   **Monitoring (Current):** Vercel Analytics, Supabase Console. Aspirational: Sentry, Prometheus/Grafana.

### Security & Compliance
*   HTTPS (Current). OWASP Best Practices, HIPAA/GDPR Considerations (Goals).
*   Audit logging (Supabase offers some; more detailed needed for AI clinical decisions).

### Third-Party Integrations
*   **Current:** OpenAI API.
*   **Aspirational:** Medical terminology/drug databases, clinical guidelines, trial registries, EHRs (FHIR/HL7).

## Frontend Architecture

_Refer to [./frontend_guide.md](./frontend_guide.md) for detailed frontend guidelines, component organization, styling, and UI patterns._

### Core Principles
*   **Component-Based Design.**
*   **Centralized Routing Logic (`ForesightApp.tsx`):** Manages view display based on URL.
*   **Global Layout (`layout.tsx`, `ContentSurface`):** Consistent UI structure.
*   **Logging Strategy:** Concise `Prod Debug` logs in `SupabaseDataService` and `/api/advisor`.

### Directory Structure Highlights
*   `src/app/`: Next.js App Router files (pages, global layout).
*   `src/components/`: React components (`ForesightApp.tsx`, `views/`, `ui/`, `layout/`).
*   `src/lib/`: Utilities (`supabaseClient.ts`, `supabaseDataService.ts`, `clinicalEngineService.ts` - MOCK for Tools B/F).

### Component Architecture
*   **Global Layout (`src/app/layout.tsx`):** Renders `GlassHeader`, `GlassSidebar`, main content area with `ContentSurface`.
*   **View Router (`src/components/ForesightApp.tsx`):** Client component using `usePathname()` to render appropriate view from `src/components/views/`. Manages global states (e.g., `activePatient`, mock alerts for Tool D).
*   **View Components (`src/components/views/`):** Main content for sections (Dashboard, Patients, Advisor for Tool A, placeholders for Tools B/D/F).
*   **UI Components (`src/components/ui/`, `src/components/layout/`):** Reusable elements.

### Routing Strategy
*   Next.js App Router. Directory structure defines routes. `page.tsx` files delegate to `ForesightApp.tsx` for view rendering.

## Backend Architecture and Data Layer

### Data Source (Supabase)
*   **Primary Database:** PostgreSQL hosted on Supabase.
*   **Schema Management:** `scripts/schema.sql` (defines `patients`, `encounters`, `conditions`, `lab_results` tables, etc.).
*   **Key Tables:**
    *   `patients`: Demographics, **`alerts` (mock data for Tool D)**, primary diagnosis.
    *   `encounters`: Consultations, notes, treatments.
    *   `conditions`: Diagnoses and problem list items.
    *   `lab_results`: Observations like labs and vitals.
    *   `differential_diagnoses`: AI-generated differentials.
    *   `transcripts`: Detailed consultation transcripts (input for aspirational Tool B).
*   **Data Interaction:** `supabaseClient.ts`, `supabaseDataService.ts`.
*   **No Local Mock Data Files for Primary Data:** All live data from Supabase.

### API Layer
*   **Supabase Auto-generated APIs.**
*   **Custom Next.js API Routes (`src/app/api/`):**
    *   `/api/advisor`: Serves Tool A (Advisor), proxies to OpenAI.
*   **`src/clinical_engine_prototype/engine.py` (Standalone Prototype for Tool B):** See dedicated section below.
*   **`src/lib/clinicalEngineService.ts` (Mock Service):** Frontend mocks for Tools B & F; **not connected to any live AI backend.**

## Python Component (`src/clinical_engine_prototype/engine.py`) – Prototype for Tool B

_This section details the standalone Python script `src/clinical_engine_prototype/engine.py`, an early-stage prototype for the aspirational **Tool B (Diagnosis and Treatment Engine)**._

**Important Current Status:**
*   **Not Integrated:** `src/clinical_engine_prototype/engine.py` is **NOT currently integrated** into the live Next.js web application.
*   **Not Used by Tool A:** It does **NOT** power the current Advisor (Tool A).
*   **Standalone Prototype:** Can only be run independently for conceptual testing.

### Tool B Vision (Diagnosis and Treatment Engine)
*   **Inputs:** Pre-existing patient information, consultation transcript.
*   **Process:** Create diagnostic plan, execute workstreams, synthesize results.
*   **Outputs:** Physician-amendable diagnosis & treatment plan, potential for document generation (referrals, prior auth).
*   **Future:** Parse novel clinical research.

### `engine.py` Prototype Details
*   **Runtime & Dependencies:** Python 3.9+, Pydantic 1.10+.
*   **Structure:** `ClinicalEngine` class with methods like `generate_diagnostic_plan`, `execute_diagnostic_plan`, `generate_diagnostic_result`.
*   **Clinical Engine Pipeline (Refactored Logic):**
    1.  **Input Processing (Symptom Extraction):** `extract_symptoms_from_transcript()`.
    2.  **Plan Creation (`generate_diagnostic_plan`):** Creates `DiagnosticPlan`.
    3.  **Plan Execution (`execute_diagnostic_plan` via `PlanExecutor`):** Asynchronous, populates `findings`.
    4.  **Diagnosis Synthesis (`generate_diagnostic_result`):** Produces `DiagnosticResult`.
    5.  **Output Document Generation (Optional Utilities):** `generate_prior_authorization`, etc.
*   **Data Input for Prototype:** Expects patient data via Pydantic `Patient` model (populated from EMR/Supabase by calling service).
*   **Integration Entry Point (Conceptual):** `run_full_diagnostic()` coroutine for API call.
*   **Current API Data Handling (MVP v0 - FastAPI `/run-dx` in `main.py`):**
    *   `/run-dx` expects `patient_id`, `transcript`, `patient_data_dict` (JSON).
    *   Frontend gathers this data (reusing Supabase loading logic).
    *   Output is `DiagnosticResult` JSON. Frontend populates editable UI; saving is separate.
*   **Future Integration:** Could be containerized (FastAPI/Flask) or re-implemented in TypeScript.

## Target State Considerations & AI Tool Roadmap

The architecture aims to support the following future capabilities:

*   **Tool A (Advisor) Enhancements:** Patient context awareness, UI reliability.
*   **Tool B (Diagnosis and Treatment Engine):** Full implementation as described above, integrating `src/clinical_engine_prototype/engine.py` concepts. UI placeholders exist.
*   **Tool C (Medical Co-pilot):** Real-time nudges during consultations.
*   **Tool D (Complex Conditions Alerts):** Intelligent alerts from Tool B outputs. Mock data currently shown via `patients.alerts`.
*   **Tool F (Clinical Trial Matching):** Automated trial matching. Mock data currently shown.
*   **Data Fetching & Real-time Updates:** May require WebSockets for advanced tools.

## Testing and Component Documentation

_Refer to [./development_guide.md#testing-standards](./development_guide.md#testing-standards) for the comprehensive testing strategy._

*   **E2E Tests:** Playwright for critical flows (Tool A, navigation, sidebar).
*   **Storybook Stories:** For UI components (`SeverityBadge`, `LikelihoodBadge`, etc.).

## Build, Performance, and Deployment Considerations

*   **Dependency Management:** `pnpm`. `node_modules` can be large due to dev dependencies (Next.js SWC, Cloudflare tooling).
*   **Build Scripts:** `pnpm run build` (Next.js), `pnpm run build:worker` (Cloudflare).
*   **Performance Optimizations:** Dependency caching, selective builds. Future: lazy loading (e.g., Recharts), icon optimization (using `@phosphor-icons/react` which is tree-shakeable).
*   **ESLint Version:** Pinned to v8.57.1.

## Advisor Tab: Model Selection & Rendering Pipeline

*   **Model Selection:** Defaults to `gpt-4.1-mini`. "Think" mode switches to `o3`.
*   **Rendering Pipeline (JSON-based, not Markdown streaming as of latest updates):**
    *   **Backend (`/api/advisor`):** Requests JSON from OpenAI (schema for paragraphs, lists, tables, refs). Streams JSON to frontend.
    *   **Frontend (`AdvisorView.tsx`):** Buffers tokens to form valid JSON. Parses JSON and renders using React components for each content type.
    *   **Benefits:** Robust, secure (no `dangerouslySetInnerHTML`), extensible.

## Plasma Background Effect
_For details on the Three.js + GLSL plasma background, see [./PLASMA_EFFECT.md](./PLASMA_EFFECT.md). It runs outside the React tree for stability._

#### Physician Experience (PX)

-   **AI Chat & Advisor (Tool A):**
    -   Interface: Chat panel, potentially integrated within patient workspace tabs.
    -   Input: Text queries, voice commands, clicks on suggested follow-ups.
    -   Output: Text responses, citations, suggested actions.
-   **Clinical Workup & Plan (Tool B):**
    -   Interface: Structured input forms, review panels for AI suggestions.
    -   Input: Basic encounter information, symptoms/observations, potentially EMR data via FHIR.
    -   Output: Differential diagnoses, diagnostic plan, recommended tests/treatments, draft notes/referrals.

### Data Flow
*   **Patient Workspace Backend (`/api/patient/[id]/`, etc. - TBD):**
    *   Manages CRUD for patient core data, encounters, conditions, labs etc.
    *   Handles saving of AI-generated content to appropriate records (e.g., SOAP notes to encounters, diagnoses to conditions).
*   **Schema Management:** `scripts/schema.sql` (defines `patients`, `encounters`, `conditions`, `lab_results` tables, etc.).
*   **Data Store (Supabase/Postgres):**
    *   `patients`: Core demographics.
    *   `encounters`: Consultations, notes, treatments.
    *   `conditions`: Diagnoses and problem list items.
    *   `lab_results`: Observations like labs and vitals.
    *   `differential_diagnoses`: AI-generated differentials.
*   **Data Interaction:** `supabaseClient.ts`, `supabaseDataService.ts`.
*   **No Local Mock Data Files for Primary Data:** All live data from Supabase. 