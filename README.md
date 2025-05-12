# Foresight Clinical Decision Support System (CDSS) - MVP Prototype

## Overview

Foresight CDSS is a browser-based clinical decision support system prototype. This MVP (Minimum Viable Product) focuses on demonstrating core UI/UX concepts and a refactored frontend architecture. It uses mock data to simulate functionalities like patient dashboards, lists, and workspaces. The system is designed to eventually assist healthcare providers with diagnostic planning, treatment recommendations, and complex case identification for autoimmune and oncology conditions by integrating ambient voice transcription, clinical data analysis, AI diagnostic assistance, and automated documentation.

**Note:** This is currently a prototype and does not connect to live backend services or perform real clinical analysis. The data displayed is mock data for demonstration purposes.

## Features (Current Prototype Highlights)

*   **Modular UI Components:** Demonstrates a component-based architecture with reusable UI elements for:
    *   Dashboard Overview
    *   Patient List & Search
    *   Individual Patient Workspace (Demographics, Admissions, Diagnoses, Labs - using mock data)
    *   Alerts, Analytics, and Settings screens (placeholders or basic views)
*   **Client-Side Routing:** Utilizes Next.js for routing, with a central `ForesightApp.tsx` component managing view rendering.
*   **Glassmorphism UI:** Features a modern "glassmorphism" visual style for header and sidebar.
*   **Responsive Layout:** Basic responsive design for different screen sizes.

## Target State Features (Vision)

The long-term vision for Foresight CDSS includes:
*   **Ambient Voice Transcription & Note Generation:** Real-time transcription and automatic SOAP note generation.
*   **EHR Integration:** Securely connect to Electronic Health Record systems.
*   **AI Diagnostic & Treatment Advisor:** Symptom-based diagnostic plans, evidence-based results, and treatment recommendations.
*   **Real-time Clinical Co-pilot:** Context-aware suggestions during consultations.
*   **Complex Case Alerting:** Passive scanning for potential complex conditions (autoimmune, oncology) and clinical trial eligibility.
*   **Documentation Automation:** Generation of prior authorization requests and specialist referral letters.
*   **Clinical Chatbot:** AI-powered assistant for general medical questions.

## Getting Started

### Prerequisites
- Node.js (version specified in `.nvmrc` if available, otherwise LTS recommended, e.g., 18.x or 20.x)
- pnpm (Package manager. If not installed, run `npm install -g pnpm`)

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

### Running the Development Server
To start the Next.js development server:
```bash
pnpm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### Building the Project
To create a production build:
```bash
pnpm run build
```

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

The application currently uses mock data loaded from `public/data/`.

*   **Dashboard:** Provides a landing page.
*   **Patient List:** (`/patients`) Displays a list of mock patients.
*   **Patient Workspace:** (Accessed by clicking a patient) Shows tabs for Demographics, Admissions, Diagnoses, and Labs using mock data.
*   **Other sections:** Alerts, Analytics, Settings are placeholders or have minimal functionality in the prototype.

## Technical Architecture (Current Frontend)

*   **Framework:** Next.js (App Router paradigm)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, CSS Modules. Features a "glassmorphism" theme.
*   **State Management:** React Context and local component state (e.g., within `ForesightApp.tsx` for global UI states like active patient).
*   **Component Structure:**
    *   Global Layout: `src/app/layout.tsx` renders `GlassHeader` and `GlassSidebar`.
    *   View Components: Located in `src/components/views/` (e.g., `DashboardView.tsx`, `PatientsListView.tsx`, `PatientWorkspaceView.tsx`).
    *   Routing Logic: `src/app/ForesightApp.tsx` acts as a client-side router, determining which view component to render based on the URL pathname.
    *   Page Entry Points: Files like `src/app/page.tsx`, `src/app/patients/page.tsx` primarily render `<ForesightApp />`.
*   **Testing:**
    *   **Storybook:** For UI component development and visualization.
    *   **Playwright:** For end-to-end testing.
*   **Linting/Formatting:** ESLint, Prettier (assumed, common for Next.js projects).

### Data Model (Mock Data Structure)
The prototype uses mock data primarily from TSV and TXT files in `public/data/100-patients/`:
- `Enriched_Patients.tsv`: Patient demographic information.
- `Enriched_Admissions.tsv`: Admission records.
- `AdmissionsDiagnosesCorePopulatedTable.txt`: Diagnoses linked to admissions.
- `LabsCorePopulatedTable.txt`: Laboratory test results.

## Data Pipeline (Mock Data Source)

The application currently loads static mock data files at runtime. These are located in:
- `public/data/100-patients/Enriched_Patients.tsv`
- `public/data/100-patients/Enriched_Admissions.tsv`
- `public/data/100-patients/AdmissionsDiagnosesCorePopulatedTable.txt`
- `public/data/100-patients/LabsCorePopulatedTable.txt`

There is no live data pipeline or backend integration in this MVP prototype.

## Support
For questions regarding this prototype, please refer to the project's GitHub repository and issues.

## Documentation

- [Architecture](docs/architecture.md)
- [Build Optimisation](docs/BUILD_OPTIMIZATION.md)
- [Plasma Background Effect](docs/PLASMA_EFFECT.md)

## Database (Supabase)

This prototype can optionally fetch data from a managed Postgres instance provided by Supabase. To enable it:

1. Create a project in Supabase and apply the schema in `scripts/schema.sql` via the SQL editor.
2. Copy your project URL and **anon/public** API key into a local environment file `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your–anon–key>"
```

3. Seed the database with the bundled mock dataset:

```bash
pnpm migrate:data
```

4. Start the dev server with the feature flag turned on:

```bash
NEXT_PUBLIC_USE_SUPABASE=true pnpm dev
```

If the flag is omitted the app will continue to read from local TSV files, ensuring a safe fallback.
