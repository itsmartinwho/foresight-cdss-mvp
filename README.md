# Foresight Clinical Decision Support System (CDSS) - MVP Prototype

## Overview

Foresight CDSS is a browser-based clinical decision support system prototype. This MVP (Minimum Viable Product) focuses on demonstrating core UI/UX concepts and functional AI features. It uses a Supabase backend (PostgreSQL) to manage and serve realistic patient data, providing a comprehensive platform for patient dashboards, consultation workflows, and AI-powered clinical assistance.

The system currently features:
*   **Tool A (Advisor):** An AI-powered chatbot for general medical questions using OpenAI's API.
*   **Tool B (Clinical Engine):** A functional AI diagnostic pipeline that processes patient data, generates diagnoses with differentials, creates SOAP notes, and produces document drafts.
*   **Tool C (Medical Co-pilot):** A real-time AI alerts system that provides intelligent clinical decision support during consultations, including complex condition detection, drug interaction alerts, and comprehensive post-consultation analysis.

**Note:** This is a prototype. For detailed architecture, AI tool status, frontend and development guidelines, please refer to the comprehensive documentation in the `/docs` directory:
*   **[System Architecture](./docs/architecture.md):** The primary source of truth for system design, AI tools, data layer, application flow, and tech stack.
*   **[Frontend Guide](./docs/frontend_guide.md):** Detailed frontend development guidelines, styling conventions, component structure, and UI patterns.
*   **[Development Guide](./docs/development_guide.md):** Rules for development process, coding standards, version control, testing strategy, and more.
*   **[Clinical Engine Guide](./docs/clinical-engine.md):** Detailed documentation of the Clinical Engine (Tool B), including its V3 architecture and batch processing capabilities.

## Features (Current Prototype Highlights)

*   **FHIR-Aligned Data Model:** Core data structures (Patient, Encounter, Condition, Observation) map to FHIR concepts.
*   **Supabase Integration:** Patient and encounter data managed in Supabase (PostgreSQL).
*   **Tool A - Foresight Advisor:** AI medical advisor chat (OpenAI powered via `/api/advisor`).
    *   Features citations, follow-up questions, voice input/playback, streamed responses.
*   **Tool B - Clinical Engine:** Functional AI diagnostic pipeline with:
    *   Symptom extraction from transcripts
    *   Diagnostic plan generation and execution
    *   Primary diagnosis with confidence scoring
    *   Differential diagnoses with likelihood assessment
    *   SOAP note generation
    *   Treatment recommendations
    *   Referral document generation (in development)
*   **Tool C - Medical Co-pilot:** Real-time AI alerts system with:
    *   Real-time consultation monitoring and alerts
    *   Complex condition detection (autoimmune, inflammatory, oncology patterns)
    *   Drug interaction alerts
    *   Missing assessment suggestions
    *   Comorbidity identification
    *   Post-consultation comprehensive analysis
    *   Unified alert management with persistence
*   **Live Voice Transcription:** Real-time conversation capture using Deepgram integration.
*   **Advanced Modal System:** Draggable, minimizable modals with cross-page persistence.
*   **Clinical Guidelines Integration:** Searchable clinical guidelines with semantic search.
*   **Modular UI Components & Glassmorphism UI.**
*   **Client-Side Routing (Next.js).**

## Target State Features (Future Development)

*   **Enhanced Clinical Trial Matching:** Automated patient-trial matching based on diagnoses and eligibility criteria.
*   **Advanced Prior Authorization:** Automated prior authorization document generation with insurance integration.
*   **Multi-provider Collaboration:** Team-based clinical workflows and communication features.
*   **Advanced Analytics:** Clinical outcome tracking and performance analytics.
*   **EHR Integration:** Seamless integration with external electronic health record systems.
*   **Mobile Application:** Point-of-care mobile access for clinical decision support.

## Getting Started

### Prerequisites

| Tool                     | Minimum Version      | Notes / Installation                                  |
|--------------------------|----------------------|-------------------------------------------------------|
| Node.js                  | 18 LTS (e.g., 18.x)  | [https://nodejs.org/](https://nodejs.org/) (20.x also fine) |
| pnpm (CLI)               | 8                    | `npm install -g pnpm`                                 |
| Supabase Account         | N/A                  | Required for your own database instance.   |
| OpenAI API Key           | N/A                  | Required for Tool A (Advisor) and Tool C (Alerts).          |
| Python (Optional)        | 3.9+                 | For the Clinical Engine prototype (Tool B), located in `src/clinical_engine_prototype/` |

### Installation & Setup
1.  **Clone the repository.**
2.  **Install JavaScript dependencies:** `pnpm install`
3.  **Configure Environment (`.env.local`):**
    *   Copy from `.env.example` or create new.
    *   Add Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
    *   Add OpenAI API Key (`VITE_OPENAI_API_KEY`).
4.  **Set up Supabase Database:**
    *   Create a project on [Supabase](https://supabase.com/).
    *   Run schema from `scripts/schema.sql`.
    *   Run the unified alerts migration from `supabase/migrations/20250113000000_unified_alerts_system.sql`.
5.  **(Optional) Python Prototype Setup (Clinical Engine - Tool B):**
    *   The prototype code is located in `src/clinical_engine_prototype/`.
    *   To run it, navigate to that directory: `cd src/clinical_engine_prototype/`
    *   Create a virtual environment: `python3 -m venv .venv` (or `python -m venv .venv`)
    *   Activate it: `source .venv/bin/activate`
    *   Install dependencies: `pip install -r prototype_requirements.txt`
    *   You can then run the API server: `uvicorn api:app --reload` (from within `src/clinical_engine_prototype/`)
    *   Or run the engine directly: `python engine.py` (from within `src/clinical_engine_prototype/`)
    *   Refer to details in **[docs/clinical-engine.md](./docs/clinical-engine.md)** and comments in the Python files for more context.

### Common Commands

| Action                       | Command                 |
|------------------------------|-------------------------|
| Start Development Server     | `pnpm run dev`          |
| Create Production Build      | `pnpm run build`        |
| Start Production Server      | `pnpm run start`        |
| Lint Code                    | `pnpm run lint`         |
| Type Check Only              | `pnpm exec tsc --noEmit`|
| Run Storybook                | `pnpm run storybook`    |
| Run Playwright E2E Tests     | `pnpm run test:e2e`     |

Navigate to `http://localhost:3000` for the dev server.

### Troubleshooting
*   **Node-gyp errors:** Ensure build tools are installed.
*   **Port 3000 in use:** `pnpm run dev -- -p <other_port>`.
*   **Type mis-matches:** `pnpm run lint` or `pnpm exec tsc --noEmit`.
*   **Icon import errors:** Ensure imports use `@phosphor-icons/react`.
*   **ESLint version issues:** Project pinned to ESLint v8.57.1.

## Project Documentation

For a comprehensive understanding of the project, please refer to the following documents in the `/docs` directory:

*   **[System Architecture](./docs/architecture.md):** The primary source of truth for system design, AI tools (current and aspirational), data layer, application flow, tech stack, and backend details.
*   **[Frontend Guide](./docs/frontend_guide.md):** Covers all aspects of frontend development, including component structure, styling conventions (Tailwind CSS, Shadcn/UI, glassmorphism, input styling), state management, accessibility, and performance for the Next.js/React application.
*   **[Development Guide](./docs/development_guide.md):** Provides guidelines for the development process, including coding standards, version control (Git workflow, conventional commits), comprehensive testing strategy (unit, integration, E2E with Playwright, Storybook), code review process, and deployment practices.
*   **[Clinical Engine Guide](./docs/clinical-engine.md):** Detailed documentation of the Clinical Engine (Tool B), including its V3 architecture and batch processing capabilities.
*   **[Advisor Guide](./docs/advisor.md):** Guide to the Advisor feature (Tool A), including its integration with OpenAI's Code Interpreter.
*   **[Transcription System](./docs/transcription.md):** Comprehensive documentation of the transcription system, including its architecture and development best practices.
*   **[Demo System](./docs/demo_system.md):** Guide to the demo system, including its architecture and testing procedures.
*   **[Clinical Guidelines](./docs/clinical-guidelines.md):** Documentation of the clinical guidelines system and integration.
*   **[History](./docs/history.md):** Log of notable incidents, bug fixes, and data recovery operations.

The `README.md` provides a high-level overview and setup instructions. For in-depth information, consult the specialized documents above.