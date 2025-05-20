# Tech Stack Document for Foresight CDSS MVP

## Overview
This document outlines a comprehensive list of technologies relevant to the Foresight Clinical Decision Support System (CDSS) MVP, covering both currently implemented components and aspirational future development. 

**For the definitive guide to the *current, implemented* tech stack, AI tool architecture (Tool A live, Tools B,C,D,F aspirational), and data layer, please refer to [../docs/architecture.md](../docs/architecture.md).**

Technologies listed here that are not explicitly detailed as "current" in `docs/architecture.md` should be considered **aspirational, under consideration for future tools, or general best-practice options** rather than part of the immediate, implemented MVP.

## Frontend Stack (Current & Aspirational)

### Core Technologies (Current)
- **React**: JavaScript library for building the user interface.
- **TypeScript**: Superset of JavaScript adding static type definitions.
- **Next.js**: React framework providing server-side rendering, App Router, API routes, and development features.

### UI Components & Styling (Current)
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **Shadcn/UI**: Component library built on Radix UI primitives (for accessible base components like buttons, dialogs, etc.).
- **Custom Components**: In `src/components/ui` and `src/components/layout`.
- **Animation (Aspirational/If Used):** Framer Motion (If specific complex animations are needed beyond CSS/Tailwind capabilities).
- **Form Handling (Current/Aspirational):** Standard React state/handlers. React Hook Form with Zod for validation is an aspirational pattern for more complex forms.

### State Management (Current & Aspirational)
- **React Context API / `useState` / `useReducer`**: For local and shared global state (Current primary methods, e.g., in `ForesightApp.tsx`).
- **SWR/React Query (Aspirational):** For server state, caching if complex client-side caching beyond Supabase client/fetch is needed.
- **Zustand (Aspirational):** Lightweight state management for very complex global state needs, if Context API becomes insufficient.

### Visualization (Current & Aspirational)
- **Recharts (Aspirational/If Used):** Composable charting library for React (e.g., for `AnalyticsScreenView`).
- **D3.js (Aspirational):** For highly custom/complex visualizations if Recharts is insufficient.
- **`react-pdf` (Aspirational):** PDF generation for reports (e.g., future Tool B outputs like referral forms).

### Testing (Current & Aspirational)
- **Playwright (Current):** For End-to-End (E2E) testing, covering critical user flows including Tool A (Advisor).
- **Storybook (Current):** For UI component development, visual testing, and documentation of interactions.
- **Jest & React Testing Library (Aspirational):** For broader unit/integration testing of components and utilities if not covered by Storybook interaction tests.
- **MSW (Mock Service Worker) (Aspirational):** For API mocking in frontend tests if complex scenarios arise, especially for future AI tools.

## Backend Stack (Current: Supabase/Next.js APIs; Aspirational: Broader Microservices/Engines)

### Core Backend Platform (Current)
- **Supabase (PostgreSQL):** Primary managed backend providing PostgreSQL database, auto-generated REST/GraphQL APIs, authentication, and storage.
- **Next.js API Routes (Current):** Used for custom server-side logic, e.g., `/api/advisor` for Tool A, which proxies to OpenAI.

### AI Tools - Specific Technologies & Prototypes

*   **Tool A (Advisor) - Current:**
    *   Uses **Next.js API route (`/api/advisor`)**.
    *   Integrates with **OpenAI API** (GPT-4.1, GPT-3.5).
*   **Tool B (Diagnosis and Treatment Engine) - Aspirational:**
    *   **Prototype:** `clinical_engine.py` (Python, Pydantic) explores core logic.
    *   **Potential Future Stack:** Could involve evolving the Python prototype (FastAPI/Flask containerized service), or a TypeScript/Node.js rewrite. May incorporate **Machine Learning (ML) models** for advanced predictive features. May need **NLP libraries** for processing consultation transcripts.
*   **Tool C (Medical Co-pilot) - Aspirational:**
    *   Likely to require **real-time audio processing**, **Speech-to-Text services**, and fast AI models. **WebSockets** or similar for real-time communication.
*   **Tool D (Complex Conditions Alerts) - Aspirational:**
    *   Will process outputs from Tool B. May use **ML models** for pattern recognition.
*   **Tool F (Clinical Trial Matching) - Aspirational:**
    *   Will involve **web scraping/API integration** with clinical trial databases.

### Aspirational Custom Backend (If Supabase/Next.js APIs are outgrown for AI Tools)
- **Node.js with Express.js/NestJS (Aspirational):** For building custom microservices or a more extensive backend API layer if needed for Tools B, C, D, F.
- **TypeScript (Aspirational):** For type safety in such a custom backend.
- **Database (Aspirational, if not solely Supabase):** PostgreSQL (as with Supabase), potentially with Prisma as ORM if a Node.js backend is built.
- **Caching (Aspirational):** Redis for in-memory caching for a custom backend.
- **Storage (Aspirational, if not solely Supabase):** S3-compatible storage for large files/documents generated by AI tools.

### API & Communication (General/Aspirational)
- **REST API**: Primary architecture for Supabase and custom Next.js routes. Would be used for any future custom backend services.
- **GraphQL (Aspirational/Future):** Supabase offers it. Could be used for complex data requirements if beneficial.
- **OpenAPI/Swagger (Aspirational):** For documenting any future custom backend APIs.

## DevOps & Infrastructure (Current & Aspirational)

### Development Environment (Current)
- **pnpm**: Package manager.
- **ESLint**: Code linting.
- **Prettier**: Code formatting.
- **Docker (Aspirational/If Needed):** For containerizing future AI services (e.g., a Python-based Tool B engine).

### CI/CD (Current & Aspirational)
- **GitHub Actions (Current):** For automated testing and deployment pipelines (e.g., for Next.js frontend).

### Deployment & Hosting (Current & Aspirational)
- **Vercel/Netlify (Current):** For Next.js frontend hosting and preview deployments.
- **Supabase (Current):** Hosts the PostgreSQL database and backend services.
- **Cloud Provider (AWS/Azure/GCP) with Kubernetes/Serverless (Aspirational):** For deploying containerized AI microservices or complex backend components if developed in the future.
- **Terraform (Aspirational):** Infrastructure as Code if managing complex cloud infrastructure.

### Monitoring & Logging (Current & Aspirational)
- **Vercel Analytics/Supabase Console (Current):** For basic monitoring of frontend and Supabase backend.
- **Sentry (Aspirational):** For more detailed error tracking.
- **Prometheus/Grafana, OpenTelemetry, Winston/Pino (Aspirational):** For comprehensive monitoring if custom backend services are built.

## Security & Compliance
(General best practices apply, specific implementations depend on chosen services)

### Security Measures
- **HTTPS (Current):** Via Vercel/Supabase.
- **OWASP Best Practices (Goal).**
- **Dependency Scanning (Goal).**

### Healthcare Compliance
- **HIPAA/GDPR Considerations (Goal):** Requires careful design for any system handling PHI, especially with AI tools. Data de-identification, secure data handling, audit logging are key.
- **Audit logging (Current/Aspirational):** Supabase offers some logging. More detailed application-level audit trails for clinical decisions (especially from AI tools) would be needed.

## Third-Party Integrations

### Current Integrations
- **OpenAI API (Current):** For Tool A (Advisor).

### Planned/Aspirational Integrations (especially for Tools B, F and data enrichment)
- **Medical terminology databases** (SNOMED, ICD-10, LOINC).
- **Drug interaction databases** (for Tool B).
- **Medical evidence databases / Clinical guidelines** (for Tool B).
- **Clinical trial registries** (e.g., ClinicalTrials.gov for Tool F).
- **Electronic Health Record (EHR) systems** (via FHIR or HL7 - major future goal).

## Development Tooling (Current)

### Code Quality & Collaboration
- **Git & GitHub**: Version control and repository hosting.
- **Pull Request workflows**: Code review process.
- **Conventional Commits**: Standardized commit messages.

### Documentation
- **Markdown**: For `/docs` and other documentation files.
- **Storybook (Current):** For UI component documentation.
- **JSDoc/TSDoc (As needed):** For code documentation.

### Project Management
- **Jira/Linear**: Issue tracking and project management
- **Figma**: Design collaboration
- **Notion/Confluence**: Knowledge base and documentation

## Performance Optimization

### Frontend Optimization
- **Code splitting**: For reduced bundle sizes
- **Server-side rendering**: For improved initial load performance
- **Image optimization**: For faster page loads
- **Web Vitals monitoring**: For performance measurement

### Backend Optimization
- **Database indexing**: For query performance
- **Caching strategies**: For frequently accessed data
- **Horizontal scaling**: For handling increased load
- **Query optimization**: For efficient data retrieval

## Accessibility & Internationalization

### Accessibility
- **WCAG 2.1 AA compliance**: Web Content Accessibility Guidelines
- **Semantic HTML**: For screen reader compatibility
- **Keyboard navigation**: For motor impairment accessibility
- **Color contrast**: For visual impairment considerations

### Internationalization
- **i18next**: Internationalization framework
- **React-intl**: React components for internationalization
- **Right-to-left (RTL) support**: For languages requiring RTL layout