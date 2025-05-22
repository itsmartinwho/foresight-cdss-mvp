# Foresight Clinical Decision Support System (CDSS) - MVP Prototype

## Overview

Foresight CDSS is a browser-based clinical decision support system prototype. This MVP (Minimum Viable Product) focuses on demonstrating core UI/UX concepts and the initial version of its AI features. It uses a Supabase backend (PostgreSQL) to manage and serve realistic mock patient data, simulating functionalities like patient dashboards, lists, and workspaces. 

The system currently features:
*   **Tool A (Advisor):** An AI-powered chatbot for general medical questions.

The vision includes several advanced aspirational AI tools:
*   **Tool B (Diagnosis and Treatment Engine):** To assist with diagnosis and treatment plans post-consultation.
*   **Tool C (Medical Co-pilot):** For real-time guidance during consultations.
*   **Tool D (Complex Conditions Alerts):** To identify and alert for potential complex conditions.
*   **Tool F (Clinical Trial Matching):** To find relevant clinical trials.

**Note:** This is currently a prototype. It connects to a real Supabase database, features Tool A (Advisor), and has placeholder UI for some aspects of future tools (B, D, F). The `clinical_engine.py` script is a non-integrated, early prototype for Tool B. For detailed architecture and AI tool status, see [docs/architecture.md](docs/architecture.md).

## Features (Current Prototype Highlights)

*   **Supabase Integration:** Patient and admission data is managed in a PostgreSQL database hosted on Supabase.
*   **Dynamic Data Loading:** The application fetches data from Supabase at runtime.
*   **Tool A - Foresight Advisor:** Dedicated `/advisor` tab offering an AI medical advisor chat (powered by OpenAI models via `/api/advisor`).
    *   Features include citations, follow-up questions, voice dictation for input, and voice playback for responses.
    *   Responses are streamed as Markdown and rendered progressively for a responsive UI (see "Advisor Tab: Streaming Markdown Responses" section below for details).
    *   Defaults to `gpt-4.1` model; **Think** mode switches to `o3-mini` for different reasoning tasks (details in [docs/architecture.md](docs/architecture.md)).
*   **Placeholder UI for Future AI Tools:**
    *   **Tool B (Diagnosis/Treatment):** UI elements exist for displaying diagnoses, treatment plans, and generated documents (referrals, prior auth), currently with mock data or empty.
    *   **Tool D (Complex Alerts):** Displays pre-existing mock complex case alerts on the dashboard and alerts screen.
    *   **Tool F (Clinical Trials):** UI placeholders exist for listing clinical trials, currently with mock data.
*   **Live Voice Transcription:** Real-time voice transcription is available within the consultation workspace to capture notes.
*   **Modular UI Components:** Demonstrates a component-based architecture with reusable UI elements for:
    *   Dashboard Overview
    *   Patient List & Search
    *   Individual Patient Workspace (Demographics, Admissions, etc., using data from Supabase)
    *   Alerts, Analytics, and Settings screens (basic views, with alerts using mock data).
*   **Client-Side Routing:** Utilizes Next.js for routing, with a central `ForesightApp.tsx` component managing view rendering.
*   **Glassmorphism UI:** Features a modern "glassmorphism" visual style. The secondary button now uses a glassy/translucent inside with a teal-to-yellow gradient border and shine (see docs/frontend-styling-guide.md for details).
*   **Consultation Duration:** Optional duration field for new consultations.
*   **Responsive Layout:** Basic responsive design.

## Target State Features (Vision)

_The long-term vision for Foresight CDSS, centered around the full implementation and integration of AI Tools A, B, C, D, and F, is detailed in [docs/architecture.md#target-state-considerations](docs/architecture.md#target-state-considerations). Key aspects include:_

*   **Enhanced Tool A (Advisor):** Patient-context aware, improved UI functionality.
*   **Full Tool B (Diagnosis and Treatment Engine):** Ingesting patient data & transcripts, generating comprehensive diagnoses, treatment plans, and automated documentation (referrals, prior auth forms), potentially parsing online research.
*   **Tool C (Medical Co-pilot):** Real-time, high-confidence clinical nudges during consultations.
*   **Tool D (Complex Conditions Alerts):** Intelligent scanning of Tool B's outputs to generate high-confidence alerts for conditions like cancer or autoimmune diseases.
*   **Tool F (Clinical Trial Matching):** Automated scanning for and matching of patients to eligible clinical trials.
*   **Automated Note Generation:** (Potentially part of Tool B or a separate system) Automatic SOAP note generation from ambient voice transcription during consultations.
*   **EHR Integration:** Secure connection to Electronic Health Record systems for data exchange.

## Getting Started

### Prerequisites

| Tool                     | Minimum Version      | Notes / Installation                                  |
|--------------------------|----------------------|-------------------------------------------------------|
| Node.js                  | 18 LTS (e.g., 18.x)  | [https://nodejs.org/](https://nodejs.org/) (20.x also fine) |
| pnpm (CLI)               | 8                    | `npm install -g pnpm`                                 |
| Supabase Account         | N/A                  | Required for setting up your own database instance.   |
| OpenAI API Key           | N/A                  | Required for Tool A (Advisor) functionality.          |
| Python (Optional)        | 3.9+                 | If working on `clinical_engine.py` (Tool B prototype) |
| pip (Optional)           | 22                   | Bundled with Python ≥ 3.9 (for `clinical_engine.py`)    |

### Installation & Setup
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/itsmartinwho/foresight-cdss-mvp.git
    cd foresight-cdss-mvp
    ```
2.  **Install JavaScript dependencies:**
    ```bash
    pnpm install
    ```
3.  **Configure Environment (`.env.local`):**
    *   Create `.env.local` in the root directory by copying from `.env.example` if it exists, or create it new.
    *   Add Supabase credentials:
        ```env
        NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
        NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
        ```
    *   Add OpenAI API Key (for Tool A):
        ```env
        VITE_OPENAI_API_KEY="your-openai-api-key"
        ```
4.  **Set up Supabase Database:**
    *   Create a project on [Supabase](https://supabase.com/).
    *   In your Supabase project's SQL Editor, run the schema definition from `scripts/schema.sql` to create tables (`patients`, `visits`, `transcripts`).
    *   Seed data manually via the Supabase interface or SQL if needed.
5.  **(Optional) Python Prototype Setup (`clinical_engine.py` - Tool B):**
    *   If you intend to work on the standalone `clinical_engine.py` prototype:
        ```bash
        python -m venv .venv
        source .venv/bin/activate  # On Windows: .venv\Scripts\activate
        pip install pydantic>=1.10
        ```
    *   Refer to [.cursor/rules/python.md](.cursor/rules/python.md) for more details on this prototype.

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

### Running the Development Server
```bash
pnpm run dev
```
Navigate to `http://localhost:3000`. The application will connect to your configured Supabase instance.

### Building for Production
```bash
pnpm run build
```

### Running Storybook
To explore UI components in isolation:
```bash
pnpm run storybook
```
This usually opens at `http://localhost:6006`.

### Running Playwright E2E Tests
Ensure the development server (`pnpm run dev`) is running or use Playwright's auto-server start feature (see `playwright.config.ts`):
```bash
pnpm run test:e2e
```

### Troubleshooting
1.  **Node-gyp errors on `pnpm install`**: Ensure build tools are installed (Xcode Command Line Tools on macOS, `build-essential` on Linux, or Visual Studio Build Tools on Windows).
2.  **Port 3000 is in use**: Run `pnpm run dev -- -p <other_port>` (e.g., `pnpm run dev -- -p 3001`).
3.  **Type mis-matches**: Run `pnpm run lint` (which should include type checking via `tsc --noEmit` as part of its script or a pre-lint step if configured) or `pnpm exec tsc --noEmit` directly.
4.  **Deployment/Build Issues with Icons**: The project migrated from `phosphor-react` to `@phosphor-icons/react` due to build errors. Ensure all icon imports use `@phosphor-icons/react`. If `Module not found: Can't resolve 'phosphor-react'` or similar errors occur, double-check all import statements.
5.  **ESLint Version Incompatibility**: The project is pinned to ESLint v8.57.1. If you encounter ESLint errors like "Invalid Options: - Unknown options: useEslintrc, extensions", ensure you are using this version or that your ESLint configuration is compatible with v9+ if you upgrade.

## Technical Architecture Summary

_For a comprehensive understanding of the current architecture, including the AI tool landscape, data flows, and component interactions, please refer to **[docs/architecture.md](docs/architecture.md)**. For styling specifics, see **[docs/frontend-styling-guide.md](docs/frontend-styling-guide.md)**._

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Backend:** Supabase (PostgreSQL) for data; Next.js API Routes for custom logic (e.g., `/api/advisor` for Tool A).
*   **Styling:** Tailwind CSS, global styles.
*   **Static Assets:**
    *   **Favicon:** The project uses `src/app/favicon.ico`, which is automatically picked up by Next.js (App Router convention). No explicit `<link>` tag is needed in `layout.tsx`.
    *   **Loading Animation:** The primary loading animation GIF (`public/slower-load-animation.gif`) is preloaded in `src/app/layout.tsx` for performance and displayed by `src/components/LoadingAnimation.tsx`.
*   **AI Tools Overview:**
    *   **Tool A (Advisor):** Live, uses OpenAI via `/api/advisor`.
    *   **Tools B, D, F:** Aspirational, with some placeholder UI and mock data. `clinical_engine.py` is a non-integrated prototype for Tool B.
    *   **Tool C:** Fully aspirational.
*   **State Management:** React Context, local component state.
*   **Testing:** Storybook for UI components, Playwright for E2E tests.

### Data Model & Source
The primary data source is a PostgreSQL database managed by **Supabase**. Key tables include `patients`, `visits`, and `transcripts`. Schema details are in `scripts/schema.sql` and [docs/architecture.md](docs/architecture.md).

## Logging / Debugging
(As previously described, points to console logs from SupabaseDataService and /api/advisor)

## Documentation

Key project documentation can be found in the `/docs` directory:
*   **[Architecture Document (docs/architecture.md)](docs/architecture.md):** The primary source of truth for system design, AI tool status, data layer, and integration details. Contains essential cross-references to other documentation for Tool B.
*   **[Frontend Styling Guide (docs/frontend-styling-guide.md)](docs/frontend-styling-guide.md):** Details on UI styling, layout patterns, and component-specific styling rules.
*   **[Plasma Background Effect (docs/PLASMA_EFFECT.md)](docs/PLASMA_EFFECT.md):** Explanation of the animated background effect.

Specific guidelines and rules are also present in:
*   **[.cursor/rules/](.cursor/rules/)**: Contains notes on the `clinical_engine.py` prototype.
*   **[rules/](rules/)**: Contains various other guidelines (implementation plans, frontend/backend aspirational designs, etc.). These generally defer to `/docs` for authoritative current-state information.

Refer to these documents for a comprehensive understanding of the project.

## Advisor Tab: Streaming Markdown Responses

The Advisor tab (`src/components/views/AdvisorView.tsx`) provides an AI-powered chat interface that streams responses from the backend and renders them with rich Markdown formatting.

**Key aspects of the implementation:**

- **Server-Sent Events (SSE):** The backend API route (`src/app/api/advisor/route.ts`) streams responses from the LLM (e.g., OpenAI GPT models) to the client using SSE.
- **`markdown_chunk` Events:** The server sends messages of type `markdown_chunk`, each containing a piece of the overall Markdown response.
- **Server-Side Buffering:** To improve readability and reduce the "telegraph-y" effect of token-by-token streaming, the server buffers tokens from the LLM. It flushes these buffers as more complete Markdown segments (e.g., paragraphs, content before a double newline) to the client. This helps maintain Markdown structure integrity during the streaming process.
- **`stream_end` Event:** A `stream_end` message signals the completion of the full response.
- **Client-Side Rendering with `streaming-markdown`:**
    - The `AdvisorView.tsx` component utilizes the `streaming-markdown` library (from `src/components/advisor/streaming-markdown/smd.js`).
    - When an assistant message stream begins, a new HTML `div` is created for that message.
    - An `smd.js` parser instance is initialized with a `default_renderer` that targets this `div`.
    - As `markdown_chunk` events arrive, their content is fed to the `smd_parser_write` function. The library progressively parses the Markdown and appends/updates the corresponding HTML elements directly within the target `div`.
    - This allows for dynamic rendering of headings, lists, bold text, tables, and other Markdown features as the data streams in.
- **Contextual Conversation:** The chat maintains conversation history. The client constructs a payload including previous user messages and the extracted text content of previous assistant responses (from their rendered Markdown) to send to the API, enabling follow-up questions.
- **Error Handling:** The system includes mechanisms to handle and display errors that might occur during the SSE connection or streaming process.

This approach provides a responsive user experience by displaying content incrementally while ensuring that complex Markdown structures are rendered correctly.