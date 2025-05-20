# Implementation Plan for Foresight CDSS MVP

## Project Overview
The Foresight Clinical Decision Support System (CDSS) MVP aims to provide healthcare professionals with AI-powered tools and evidence-based recommendations for patient care. This implementation plan outlines a phased approach, resource allocation, and key milestones, distinguishing between currently implemented features and aspirational goals.

### Current MVP Reality & Architecture

**For the definitive guide to the current system architecture, AI tools, and data layer, please refer to [../docs/architecture.md](../docs/architecture.md).**

The current application includes:
*   A **Next.js (App Router) frontend**.
*   A **Supabase (PostgreSQL) backend**.
*   **Tool A (Advisor):** An AI-powered chatbot for general medical questions, accessible via the "Advisor" tab and powered by OpenAI through the `/api/advisor` route.
*   **Placeholder UI elements** for some features of the aspirational **Tool B** (Diagnosis/Treatment: e.g., diagnosis/treatment fields, prior auth/referral forms), **Tool D** (Complex Alerts: alert displays), and **Tool F** (Clinical Trials: trial list displays). These currently show mock data or are empty.

The standalone **Python script `clinical_engine.py`** is an early-stage prototype for the aspirational **Tool B (Diagnosis and Treatment Engine)** and is **not integrated** into the current application.

Phases or items in the plan below that reference a Node.js/Express backend, Prisma (in that context), or AI tools beyond Tool A, represent **aspirational future work** or alternative designs. Checklist items should be interpreted against the current Next.js/Supabase stack and the AI tool descriptions provided in `docs/architecture.md`.

## Implementation Phases (Partially Implemented, Largely Aspirational for Advanced AI)

_The following phases describe a comprehensive build-out. Refer to `docs/architecture.md` for the current implementation state._

### Phase 1: Project Setup and Foundation - Complete
(Covered initial Next.js, Supabase setup, basic frontend components, and Tool A groundwork)

### Phase 2: Patient Management Module - Complete
(Covered patient data model in Supabase, CRUD APIs via Supabase, and UI for patient lists/details as per `docs/architecture.md`)

### Phase 3: Consultation Module - Partially Implemented
(Basic consultation data (`visits` table in Supabase) and UI for history viewing are implemented. Forms for new consultation data entry may exist.)

_Further development for comprehensive consultation management (detailed forms, multi-step flows) is aspirational and would be a prerequisite for the full vision of Tool B._

### Phase 4: Clinical Decision Support AI Tools (Current: Tool A; Future: Tools B, C, D, F)

_This phase focuses on the AI-powered tools. **Tool A is the only currently operational AI tool.**_

#### Weeks 7-9 (Illustrative for initial AI dev beyond current Tool A - Aspirational Timeline)

*   **Tool A (Advisor) - Current & Ongoing Enhancements:**
    *   [X] Basic AI Chatbot implemented (`/api/advisor` with OpenAI - see `docs/architecture.md`).
    *   [ ] **Aspirational:** Enhance Tool A with patient context awareness (pass patient data to OpenAI).
    *   [ ] **Aspirational:** Improve reliability of UI features (model switching, paper search, file uploads, voice mode).

*   **Tool B (Diagnosis and Treatment Engine) - Aspirational (Prototype: `clinical_engine.py`):**
    *   [ ] **Aspirational:** Develop core reasoning engine (based on `clinical_engine.py` concepts or new implementation).
        *   Inputs: Patient data, consultation transcripts.
        *   Process: Diagnostic workstreams, synthesis.
        *   Outputs: Diagnosis, treatment plan.
    *   [ ] **Aspirational:** Integrate Tool B output with UI (populate existing placeholder fields for diagnosis, treatment).
    *   [ ] **Aspirational:** Develop generation of related documents (referral forms, prior authorization forms) from Tool B's output (populate existing placeholder UI).
    *   [ ] **Aspirational (Further Future):** Add internet parsing for novel clinical research.

*   **Tool C (Medical Co-pilot) - Aspirational:**
    *   [ ] **Aspirational:** Design and develop real-time consultation monitoring for discrete nudges.
    *   [ ] **Aspirational:** Implement high-confidence alerting mechanism.

*   **Tool D (Complex Conditions Alerts) - Aspirational (Placeholder UI & Mock Data Exist):**
    *   [ ] **Aspirational:** Develop engine to scan Tool B outputs for complex conditions.
    *   [ ] **Aspirational:** Integrate with alert display UI (replacing current mock data from `patients.alerts`).

*   **Tool F (Clinical Trial Matching) - Aspirational (Placeholder UI & Mock Data Exist):**
    *   [ ] **Aspirational:** Develop engine to scan internet/databases for clinical trials based on patient diagnosis/profile.
    *   [ ] **Aspirational:** Integrate with clinical trial display UI (replacing current mock data).

#### CDS API & Integration (Reflects Current Tool A and Aspirational Tools)
*   [X] Recommendation endpoints for Tool A (`/api/advisor`) exist.
*   [X] Context-aware analysis for Tool A (via OpenAI prompt engineering) is in place.
*   [ ] **Aspirational:** Develop APIs for Tool B, C, D, F if they become backend services.
*   [ ] **Aspirational:** Structured evidence retrieval/linking for Tool B.
*   [ ] **Aspirational:** Systematic feedback collection for all AI tools.
*   [ ] **Aspirational:** Robust storage for AI-generated recommendations/plans (e.g., from Tool B).

#### CDS UI Components (Reflects Current Tool A and Placeholders for B, D, F)
*   [X] Recommendation display for Tool A (chat bubbles in `AdvisorView.tsx`).
*   [X] Placeholder UI for Tool B outputs (diagnosis, treatment, referral, prior auth fields).
*   [X] Placeholder UI for Tool D alerts (`AlertsScreenView.tsx`, `DashboardView.tsx`).
*   [X] Placeholder UI for Tool F clinical trials (in `PatientWorkspaceView.tsx` or similar).
*   [ ] **Aspirational:** Dedicated evidence viewer for Tool B.
*   [ ] **Aspirational:** UI for Tool C (co-pilot nudges).

### Phase 5: Testing, Refinement, and Advanced Features (Ongoing & Aspirational)

#### Comprehensive Testing (Ongoing for Tool A & Base App; Aspirational for Future AI)
*   [X] Unit/Integration testing for core components & Tool A API (Storybook, basic API tests).
*   [X] E2E tests for key flows including Tool A (Playwright).
*   [ ] **Aspirational:** Expanded test coverage for all future AI tools (B, C, D, F) as they are developed.

#### Performance Optimization (Ongoing)
*   [X] Frontend optimization (rendering, bundle size - ongoing).
*   [X] Backend optimization (Supabase queries, `/api/advisor` response times - ongoing).
*   [ ] **Aspirational:** Performance optimization for computationally intensive AI tools (B, C, D, F).

#### Final Refinement & Documentation (Ongoing)
*   [X] User/Technical Documentation (This suite of docs, `docs/architecture.md` is key).
*   [ ] **Aspirational:** Address usability issues specific to new AI tools as they are developed.

## Resource Allocation (Aspirational - Adjusted for AI Focus)

_The following is a general guideline, actual needs will depend on the complexity and implementation choices for AI tools B, C, D, F._

### Development Team
*   **Frontend Developer (1.0 FTE)**
*   **Backend/AI Developer (1.0 - 2.0 FTE)**: Focus on developing Tools B, C, D, F, potentially with Python/ML skills if `clinical_engine.py` is evolved, or full-stack TS if re-implemented.
*   **Full-Stack Developer (0.5 FTE)**
*   **UX Designer (0.5 FTE)**: Crucial for designing interactions with new AI tools.

### Additional Resources
*   **Clinical Subject Matter Expert (0.5 FTE)**: Essential for validating all AI tools.
*   **QA Engineer (0.5 FTE)**: Focus on testing AI tool outputs and complex workflows.
*   **DevOps Engineer (0.25 FTE)**

## Key Milestones (Revised for AI Tooling Roadmap)

1.  **MVP with Tool A (Advisor) Established:** (Largely Achieved)
    *   Core platform (Next.js/Supabase) functional.
    *   Tool A (Advisor) operational for general medical questions.
    *   Placeholder UI for future AI tools (B, D, F) in place.

2.  **Tool B (Diagnosis/Treatment Engine) - Initial Version:** (Aspirational)
    *   Core reasoning engine developed (e.g., evolving `clinical_engine.py` or new build).
    *   Integration with patient data and consultation transcripts.
    *   Output of diagnosis/treatment plans to existing placeholder UI.
    *   Generation of referral/prior-auth documents (initial version).

3.  **Tool D & F (Alerts & Trials) - Initial Integration:** (Aspirational)
    *   Tool D generates basic complex condition alerts from Tool B's output, replacing mock data.
    *   Tool F provides initial clinical trial matching, replacing mock data.

4.  **Tool C (Medical Co-pilot) - Proof of Concept:** (Aspirational)
    *   Basic real-time nudges demonstrated in a simulated consultation environment.

5.  **Advanced AI Capabilities & Refinement:** (Further Aspirational)
    *   Tool B incorporates internet-based research.
    *   Tools C, D, F achieve higher sophistication and broader coverage.
    *   Comprehensive testing and user feedback cycles completed for all AI tools.

## Risk Management (Adjusted for AI Focus)

*   **AI Model Accuracy & Reliability (Tools A, B, C, D, F):** High Impact. Mitigation: Rigorous testing, clinical validation, clear communication of confidence levels, human oversight (physician amends output).
*   **Data Privacy & Security for AI Training/Operation:** High Impact. Mitigation: Adherence to HIPAA/GDPR, de-identification where possible, secure infrastructure.
*   **Complexity of AI Development (esp. Tools B, C):** High Impact. Mitigation: Phased approach, clear requirements, expert AI/ML resources if needed.
*   **Integration of Multiple AI Systems:** Medium Impact. Mitigation: Modular design, well-defined APIs/interfaces between tools.
*   (Other risks like clinical validation delays, scope creep, usability remain relevant).

## Quality Assurance (Adjusted for AI Focus)

*   **Testing Strategy:** Must include validation of AI outputs against clinical expertise, testing for bias, and robustness to varied inputs for all AI tools.
*   **Quality Metrics:** Metrics specific to AI performance (e.g., precision/recall for Tool D, relevance for Tool F, clinical appropriateness for Tool B).

## Deployment Strategy
(Remains largely the same, but future AI tools might require dedicated services/APIs that need their own deployment considerations if not part of the Next.js monolith).

## Post-MVP Planning (Focused on AI Tool Expansion)

### Immediate Enhancements
*   Refine Tool A (context-awareness, UI bug fixes).
*   Develop foundational version of Tool B (Diagnosis/Treatment Engine).

### Long-term Roadmap
*   Full development and integration of Tools C, D, F.
*   Advanced features for Tool B (internet research parsing).
*   Continuous improvement of all AI models based on feedback and new data.
*   EHR integration to feed data into and receive outputs from these AI tools.