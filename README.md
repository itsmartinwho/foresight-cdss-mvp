# Foresight Clinical Decision Support System (CDSS) - MVP Prototype

## Overview

Foresight CDSS is a browser-based clinical decision support system prototype. This MVP (Minimum Viable Product) focuses on demonstrating core UI/UX concepts and the initial version of its AI features. It uses a Supabase backend (PostgreSQL) to manage and serve realistic mock patient data, simulating functionalities like patient dashboards, lists, and workspaces.

The system currently features:
*   **Tool A (Advisor):** An AI-powered chatbot for general medical questions.
*   **Tool B (Clinical Engine):** A functional AI diagnostic pipeline that processes patient data, generates diagnoses with differentials, creates SOAP notes, and produces referral/prior authorization documents.

The vision includes additional advanced AI tools (C, D, F) that are planned for future development.

**Note:** This is a prototype. For detailed architecture, AI tool status, frontend and development guidelines, please refer to the comprehensive documentation in the `/docs` directory:
*   **[System Architecture](./docs/architecture.md):** The primary source of truth for system design, AI tools, data layer, application flow, and tech stack.
*   **[Frontend Guide](./docs/frontend_guide.md):** Detailed frontend development guidelines, styling conventions, component structure, and UI patterns.
*   **[Development Guide](./docs/development_guide.md):** Rules for development process, coding standards, version control, testing strategy, and more.
*   **[Python Clinical Engine (Tool B Prototype)](./docs/architecture.md#python-component-clinical_enginepy--prototype-for-tool-b):** Specific details on the Tool B prototype. (Code located in `src/clinical_engine_prototype/`)
*   **[Plasma Background Effect](./docs/PLASMA_EFFECT.md):** Explanation of the animated background effect.

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
    *   Referral and prior authorization document generation
*   **Placeholder UI for Future AI Tools (C, D, F):** UI elements exist with mock data or empty.
*   **Live Voice Transcription:** In consultation workspace.
*   **Modular UI Components & Glassmorphism UI.**
*   **Client-Side Routing (Next.js).**

## Target State Features (Vision)

_The long-term vision, centered around AI Tools A, B, C, D, and F, is detailed in **[docs/architecture.md#target-state-considerations--ai-tool-roadmap](./docs/architecture.md#target-state-considerations--ai-tool-roadmap)**._

## Getting Started

### Prerequisites

| Tool                     | Minimum Version      | Notes / Installation                                  |
|--------------------------|----------------------|-------------------------------------------------------|
| Node.js                  | 18 LTS (e.g., 18.x)  | [https://nodejs.org/](https://nodejs.org/) (20.x also fine) |
| pnpm (CLI)               | 8                    | `npm install -g pnpm`                                 |
| Supabase Account         | N/A                  | Required for your own database instance.   |
| OpenAI API Key           | N/A                  | Required for Tool A (Advisor).          |
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
5.  **(Optional) Python Prototype Setup (Clinical Engine - Tool B):**
    *   The prototype code is located in `src/clinical_engine_prototype/`.
    *   To run it, navigate to that directory: `cd src/clinical_engine_prototype/`
    *   Create a virtual environment: `python3 -m venv .venv` (or `python -m venv .venv`)
    *   Activate it: `source .venv/bin/activate`
    *   Install dependencies: `pip install -r prototype_requirements.txt`
    *   You can then run the API server: `uvicorn api:app --reload` (from within `src/clinical_engine_prototype/`)
    *   Or run the engine directly: `python engine.py` (from within `src/clinical_engine_prototype/`)
    *   Refer to details in **[docs/architecture.md#python-component-clinical_enginepy--prototype-for-tool-b](./docs/architecture.md#python-component-clinical_enginepy--prototype-for-tool-b)** and comments in the Python files for more context.

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

*   **[System Architecture](./docs/architecture.md):** The primary source of truth for system design, AI tools (current and aspirational), data layer, application flow, tech stack, and backend details. This includes detailed information on the **`clinical_engine.py` (Tool B prototype)**.
*   **[Frontend Guide](./docs/frontend_guide.md):** Covers all aspects of frontend development, including component structure, styling conventions (Tailwind CSS, Shadcn/UI, glassmorphism, input styling), state management, accessibility, and performance for the Next.js/React application.
*   **[Development Guide](./docs/development_guide.md):** Provides guidelines for the development process, including coding standards, version control (Git workflow, conventional commits), AI-assisted development with Cursor, comprehensive testing strategy (unit, integration, E2E with Playwright, Storybook), code review process, and deployment practices.
*   **[Plasma Background Effect](./docs/PLASMA_EFFECT.md):** Explains the implementation of the animated background effect visible throughout the application.

The `README.md` provides a high-level overview and setup instructions. For in-depth information, consult the specialized documents above.