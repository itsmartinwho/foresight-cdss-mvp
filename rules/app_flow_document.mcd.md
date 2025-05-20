# App Flow Document for Foresight CDSS MVP

## Overview
This document describes the user journey and application flow within the Foresight Clinical Decision Support System (CDSS) MVP. It outlines primary workflows for currently implemented features (including **Tool A: Advisor**) and aspirational flows for future AI-powered tools (**Tools B, C, D, F**).

**For technical architecture of these tools and current implementation status, see [../docs/architecture.md](../docs/architecture.md).**

## User Roles
- **Clinicians**: Primary users who consult the system for AI-powered advice (Tool A), patient management, and in the future, for advanced decision support (Tools B, C, D, F).
- **Administrators**: (Aspirational) Users who manage system settings and user accounts.
- **Support Staff**: (Aspirational) Users who assist with patient information and administrative tasks.

## Core Workflows

### 1. Authentication Flow (Standard)
```
Login Screen → Authentication → Dashboard
                      ↓
                Error Screen
                (if auth fails)
```

#### Key Interactions:
- User enters credentials
- System validates credentials
- On success: Redirect to main dashboard
- On failure: Display appropriate error message
- Password recovery option via email

### 2. Patient Management Flow (Current)
```
Dashboard → Patient List → Patient Search → Patient Details → Edit Patient
                               ↓
                         Add New Patient
```

#### Key Interactions:
- Browse paginated list of recent patients
- Search for patients using various criteria
- View comprehensive patient information
- Update patient details as needed
- Add new patients to the system

### 3. Consultation Data Entry/Review Flow (Current - Basic; Aspirational - Detailed for Tool B)
```
Patient Details → New Consultation (Modal) → Input Basic Clinical Data (e.g., `visits` table fields) → Save Consultation
                                                              ↓
                                                        Edit/Update Data
```

#### Key Interactions (Current):
- Initiate consultation data entry from patient details
- Input basic information related to a patient visit

#### Key Interactions (Aspirational for Tool B):
- Capture detailed consultation transcript (input for Tool B)
- Review and amend structured data before or after Tool B processing

### 4. Tool A: Advisor (AI Chatbot for General Medical Questions - Current)
```
Select "Advisor" Tab → Type Question / Use Voice Input / Upload File → Receive AI-Generated Answer (Streamed)
                     ↓ (Optional UI interactions - may be buggy)
                      Switch AI Model (e.g., 'Think Harder') / Request Paper Search
```

#### Key Interactions:
- User interacts with the AI chatbot in `AdvisorView.tsx`
- Queries are sent to `/api/advisor` which proxies to OpenAI
- User can attempt to use features like model switching, paper search, file upload, dictation, voice mode
- **Future Enhancement:** Attach specific patient context to the Advisor

### 5. Tool B: Diagnosis and Treatment Engine (Aspirational - Placeholder UI Exists)
```
Consultation Ends (Data/Transcript Captured) → Trigger Tool B Analysis (Aspirational) → Physician Reviews/Amends AI-Generated Diagnosis & Treatment Plan (in placeholder UI) → Accept Plan → Optionally Generate Prior Auth/Referral (Populating placeholder forms)
```

#### Key Interactions (Aspirational):
- System ingests patient data and consultation transcript
- AI engine (prototyped by `clinical_engine.py`) processes information
- Physician interacts with UI elements (currently placeholders) to review, edit, and accept diagnosis/treatment
- System generates structured documents (referrals, prior auth) based on accepted plan, populating placeholder forms

### 6. Tool C: Medical Co-pilot (Aspirational - No UI Exists)
```
During Live Consultation → AI Co-pilot Monitors Conversation → Delivers Discrete Nudges/Notifications to Physician (High-Confidence Suggestions)
```

#### Key Interactions (Aspirational):
- Physician receives real-time, non-intrusive guidance during patient interaction

### 7. Tool D: Complex Conditions Alerts (Aspirational - Placeholder UI & Mock Data Exist)
```
Tool B Completes Diagnosis (Aspirational) → Tool D Scans Output → If High-Confidence Complex Condition Detected → Alert Appears (e.g., on Dashboard, Patient Profile, Alerts Screen - replacing current mock alerts)
```

#### Key Interactions (Aspirational):
- Physician is notified of potential complex conditions (e.g., cancer, autoimmune) flagged by the AI
- Interacts with alert details (currently placeholder UI like `AlertsScreenView.tsx` shows mock alerts)

### 8. Tool F: Clinical Trial Matching (Aspirational - Placeholder UI & Mock Data Exist)
```
Diagnosis Finalized (e.g., by Tool B or physician) / Specific Trigger Met → Tool F Scans for Clinical Trials (Aspirational) → Matching Trials Displayed in UI (replacing current mock data)
```

#### Key Interactions (Aspirational):
- Physician views list of potential clinical trials for a patient
- Interacts with trial details (currently placeholder UI shows mock trials)

### 9. Reporting/Analytics Flow (Current - Basic; Aspirational - Advanced)
```
Dashboard → Analytics Screen (`AnalyticsScreenView.tsx`) → View Basic Charts/Metrics
```

#### Key Interactions (Current):
- View pre-defined analytics based on Supabase data
#### Key Interactions (Aspirational):
- Configure custom reports, potentially incorporating AI tool usage or outcomes

## Screen-by-Screen Flow (Highlights relevant to AI tools)

### Authentication Screens (Standard)
1. **Login Screen**
   - Username/email field
   - Password field
   - "Remember me" option
   - Login button
   - Password recovery link

2. **Password Recovery**
   - Email input
   - Recovery instructions
   - Confirmation screen

### Dashboard (`DashboardView.tsx`)
- Displays summary information
- **Alerts Section (Tool D Placeholder):** Shows complex condition alerts (currently mock data, will be from Tool D)

### Patient Management Screens (`PatientsListView.tsx`, `PatientWorkspaceView.tsx`)
- **Patient Details (`PatientWorkspaceView.tsx`):**
    - **Diagnosis/Treatment Sections (Tool B Placeholder):** Areas where Tool B's output would be displayed/edited
    - **Prior Authorization/Referral Forms (Tool B Placeholder):** Placeholders for documents generated from Tool B's output
    - **Clinical Trials Section (Tool F Placeholder):** Area to display matching clinical trials (currently mock data)
    - **Alerts Display (Tool D Placeholder):** Patient-specific complex condition alerts

### Consultation Screens
- **New Consultation Modal/Form:** Captures data for `visits` table (Aspirational: capture detailed transcript for Tool B)

### Advisor Screen (`AdvisorView.tsx` - Tool A)
- Chat interface for Tool A
- Input for text, voice, file uploads
- Buttons for model switching, paper search (functionality may be buggy)
- Displays streamed AI responses

### Alerts Screen (`AlertsScreenView.tsx` - Tool D Placeholder)
- Lists all complex condition alerts (currently mock data, will be from Tool D)

### Analytics Screen (`AnalyticsScreenView.tsx`)
- Displays data visualizations (current scope based on `docs/architecture.md`)

## State Management
The application maintains state for:
- Current user session and permissions
- Active patient context
- Current consultation data
- Unsaved changes in forms
- User preferences and settings

## Error States and Recovery
- Form validation errors with clear messaging
- Network connectivity issues with retry options
- Session timeout with preservation of unsaved work
- Graceful degradation of features when services are unavailable
- Specific error handling for AI API calls, e.g., `/api/advisor`

## Performance Considerations
- Progressive loading of patient histories
- Asynchronous processing of complex analyses
- Caching of frequently accessed reference data
- Optimistic UI updates with background synchronization
- Performance of AI model responses and real-time processing for Tool C

## Accessibility Features
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Text size adjustments
- Timeout extensions for users requiring more time
- Ensure AI-generated content and new UIs are accessible