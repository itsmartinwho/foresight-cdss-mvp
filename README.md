# Foresight Clinical Decision Support System (CDSS) - MVP Prototype

## Overview

Foresight CDSS is a browser-based clinical decision support system prototype. This MVP (Minimum Viable Product) focuses on demonstrating core UI/UX concepts and a first version of the AI features. It uses a Supabase backend (PostgreSQL) to manage and serve realistic mock patient data, simulating functionalities like patient dashboards, lists, and workspaces. The system is designed to eventually assist healthcare providers with diagnostic planning, treatment recommendations, and complex case identification such as in the autoimmune and oncology areas by integrating ambient voice transcription, clinical data analysis, AI diagnostic assistance, and automated documentation.

**Note:** This is currently a prototype. It connects to a real Supabase database instance for data and features a basic AI medical advisor but does not yet perform live clinical analysis beyond what's available in the seeded dataset.

## Features (Current Prototype Highlights)

*   **Supabase Integration:** Patient and admission data is managed in a PostgreSQL database hosted on Supabase.
*   **Dynamic Data Loading:** The application fetches data from Supabase at runtime.
*   **Foresight Advisor:** Dedicated `/advisor` tab offering an AI medical advisor chat (powered by GPT models via `/api/advisor`) with features like citations, follow-up questions, voice dictation for input, and voice playback for responses.
*   **Live Voice Transcription:** Real-time voice transcription is available within the consultation workspace to capture notes.
*   **Complex Case Alert Display:** The system displays pre-existing complex case alerts associated with patients (e.g., autoimmune, oncology) on the dashboard and alerts screen.
*   **Modular UI Components:** Demonstrates a component-based architecture with reusable UI elements for:
    *   Dashboard Overview
    *   Patient List & Search
    *   Individual Patient Workspace (Demographics, Admissions, etc., using data from Supabase)
    *   Alerts, Analytics, and Settings screens (placeholders or basic views)
*   **Client-Side Routing:** Utilizes Next.js for routing, with a central `ForesightApp.tsx` component managing view rendering based on the URL.
*   **Glassmorphism UI:** Features a modern "glassmorphism" visual style for header and sidebar.
*   **Consultation Duration:** Optional duration field for new consultations; automatically sets the scheduled end time based on the selected start time.
*   **Responsive Layout:** Basic responsive design for different screen sizes.
*   **Automated Note Generation:** Automatic SOAP note generation from ambient voice transcription during consultations.
*   **EHR Integration:** Securely connect to Electronic Health Record systems.
*   **Enhanced AI Diagnostic & Treatment Advisor:** More advanced symptom-based diagnostic plans, evidence-based results, and treatment recommendations, potentially incorporating deeper EHR data.
*   **Real-time Clinical Co-pilot:** Context-aware suggestions during consultations.
*   **Advanced Complex Case Alerting:** Passive scanning of clinical data (including transcripts) to automatically identify and generate alerts for potential complex conditions and clinical trial eligibility.
*   **Documentation Automation:** Generation of prior authorization requests and specialist referral letters.
*   **Clinical Chatbot:** AI-powered assistant for general medical questions (potentially integrated or expanded from the current Advisor).

## Target State Features (Vision)

The long-term vision for Foresight CDSS includes:
*   **Automated Note Generation:** Automatic SOAP note generation from ambient voice transcription during consultations.
*   **EHR Integration:** Securely connect to Electronic Health Record systems.
*   **Enhanced AI Diagnostic & Treatment Advisor:** More advanced symptom-based diagnostic plans, evidence-based results, and treatment recommendations, potentially incorporating deeper EHR data.
*   **Real-time Clinical Co-pilot:** Context-aware suggestions during consultations.
*   **Advanced Complex Case Alerting:** Passive scanning of clinical data (including transcripts) to automatically identify and generate alerts for potential complex conditions and clinical trial eligibility.
*   **Documentation Automation:** Generation of prior authorization requests and specialist referral letters.
*   **Clinical Chatbot:** AI-powered assistant for general medical questions (potentially integrated or expanded from the current Advisor).

## Getting Started

### Prerequisites
- Node.js (version specified in `.nvmrc` if available, otherwise LTS recommended, e.g., 18.x or 20.x)
- pnpm (Package manager. If not installed, run `npm install -g pnpm`)
- Supabase Account (for setting up the database if you want to run your own instance)

### Installation & Setup
1.  Clone the repository:
    ```bash
    git clone https://github.com/itsmartinwho/foresight-cdss-mvp.git
    cd foresight-cdss-mvp
    ```
2.  Install dependencies using pnpm:
    ```bash
    pnpm install
    ```
3.  **Configure Supabase:**
    *   Create a project in Supabase ([supabase.com](https://supabase.com/)).
    *   In the Supabase SQL Editor, run the schema definition found in `scripts/schema.sql` to create the necessary tables (`patients`, `visits`, `transcripts`).
    *   In your local project, create a file named `.env.local` in the root directory.
    *   Add your Supabase project URL and **anon (public)** API key to this file:
        ```env
        NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
        NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
        ```
    *   Replace `your-project-ref` and `your-anon-key` with your actual Supabase credentials.
    *   **Seed the database (Optional):** The `scripts/schema.sql` file sets up the necessary tables. If you wish to populate the database with initial data for testing, you will need to do so manually using Supabase's SQL editor or data import features. There is no automated seeding script included in the project.

### Running the Development Server
To start the Next.js development server, ensure the `NEXT_PUBLIC_USE_SUPABASE` environment variable is set to `true` (this is the default behavior now for development and production).
```bash
pnpm run dev
```
The application will connect to your configured Supabase instance. Open your browser and navigate to `http://localhost:3000`.

### Building the Project
To create a production build:
```bash
pnpm run build
```
The build will also expect Supabase environment variables to be available if it needs to prerender pages with data.

### Running Storybook
To explore UI components in isolation using Storybook:
```bash
pnpm run storybook
```
This will typically open Storybook in your browser at `http://localhost:6006`.

### Running Playwright E2E Tests
To run end-to-end tests using Playwright:
```bash
pnpm run test:e2e
```
This will launch the Playwright test runner. Ensure the development server (`pnpm run dev`) is running in a separate terminal, as the Playwright config is set up to use an existing server on `http://localhost:3000`. Alternatively, Playwright can be configured to start the server automatically (current `playwright.config.ts` includes a `webServer` block for this).

## Usage Guide (Prototype)

The application now primarily uses data from a Supabase PostgreSQL database.

*   **Dashboard:** Provides a landing page with upcoming appointments.
*   **Consultation Duration:** When starting a new consultation, users can specify an optional duration which automatically determines the appointment's end time.
*   **Patient List:** (`/patients`) Displays a list of patients from the Supabase database.
*   **Patient Workspace:** (Accessed by clicking a patient) Shows tabs for Demographics, Admissions, Diagnoses, and Labs using data fetched from Supabase for the selected patient.
*   **Other sections:** Alerts, Analytics, Settings are placeholders or have minimal functionality in the prototype.
*   **Foresight Advisor:** (`/advisor`) AI-powered chat where clinicians can ask questions, optionally include recent papers, dictate via voice, and listen to answers.

## Technical Architecture (Current Frontend)

*   **Framework:** Next.js (App Router paradigm)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, CSS Modules. Features a "glassmorphism" theme.
*   **Layout & Scrolling Pattern (2024 Refactor):**
    *   Main views (Dashboard, Patients, Alerts, Analytics, Settings, Advisor) are wrapped in a `ContentSurface` component, which provides a frosted-glass effect and consistent padding.
    *   Do not use a `Card` for main view wrappers—this ensures full-bleed content and avoids extra padding or rounded corners at the screen edge.
    *   Scrolling is handled by an inner `<div className="flex-1 min-h-0 overflow-y-auto">` inside `ContentSurface`, so only the content area scrolls, not the page.
    *   See [Frontend Styling Guide](docs/frontend-styling-guide.md) for details and code examples.
*   **State Management:** React Context and local component state.
*   **Component Structure:**
    *   Global Layout: `src/app/layout.tsx` renders `GlassHeader` and `GlassSidebar`.
    *   View Components: Located in `src/components/views/` (e.g., `DashboardView.tsx`, `PatientsListView.tsx`, `PatientWorkspaceView.tsx`).
    *   Routing Logic:** `src/components/ForesightApp.tsx` (note: path corrected from src/app/ForesightApp.tsx as it's a component) acts as a client-side router, rendering views from `src/components/views/`.
    *   Page Entry Points:** Files like `src/app/page.tsx`, `src/app/patients/page.tsx` primarily render `<ForesightApp />` (often via a default export from a `page.tsx` in the `app` router structure which then imports and uses `ForesightApp`).
*   **Data Fetching:** Data is fetched from Supabase using a service layer (`src/lib/supabaseDataService.ts`).
*   **Testing:**
    *   **Storybook:** For UI component development and visualization.
    *   **Playwright:** For end-to-end testing.
*   **Linting/Formatting:** ESLint, Prettier.

### Data Model & Source
The primary data source is a PostgreSQL database managed by **Supabase**. The schema includes tables for `patients`, `visits`, and `transcripts`, as defined in `scripts/schema.sql`.

## Support
For questions regarding this prototype, please refer to the project's GitHub repository and issues.

## Documentation

- [Architecture](docs/architecture.md)
- [Plasma Background Effect](docs/PLASMA_EFFECT.md)

## Database (Supabase) - Primary Data Source

This application uses a managed Postgres instance provided by Supabase as its primary data source.

**Setup:**
1.  **Supabase Project:** Ensure you have a Supabase project created.
2.  **Schema:** The database schema is defined in `scripts/schema.sql`. This should be applied to your Supabase project via its SQL editor.
3.  **Environment Variables:** Configure your local environment by creating a `.env.local` file in the project root with your Supabase URL and anon key:
    ```env
    NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
    ```
    Setting `NEXT_PUBLIC_USE_SUPABASE="true"` ensures the application uses Supabase. This is the default and recommended mode.
4.  **Data Seeding (Optional):** After applying the schema from `scripts/schema.sql`, the tables will be empty. If you need sample data, you can insert it manually using the Supabase interface or by running your own SQL scripts.

The application is configured to use Supabase by default.