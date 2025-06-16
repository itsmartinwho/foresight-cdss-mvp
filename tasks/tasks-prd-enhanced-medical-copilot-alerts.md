# Task List: Enhanced Medical Co-pilot Alerts System

Based on PRD: `prd-enhanced-medical-copilot-alerts.md`

## Relevant Files

### Database Schema
- `scripts/schema.sql` - Update existing alerts schema to support new alert types and metadata
- `supabase/migrations/` - New migration files for schema changes

### Type Definitions
- `src/types/copilot.ts` - Extend existing alert types with new categories and metadata fields
- `src/types/alerts.ts` - New unified alert type definitions
- `src/types/ai-models.ts` - Type definitions for AI model responses and configurations

### AI Integration
- `src/lib/ai/gpt-models.ts` - GPT-4.1-mini and GPT-o3 API integration
- `src/lib/ai/prompt-templates.ts` - Prompt templates for different alert types
- `src/lib/ai/alert-processor.ts` - Core AI processing logic for alert generation
- `src/lib/ai/context-manager.ts` - Patient data and transcript context management

### Alert Processing
- `src/lib/alerts/alert-engine.ts` - Main alert processing engine
- `src/lib/alerts/real-time-processor.ts` - Real-time transcript analysis
- `src/lib/alerts/post-consultation-processor.ts` - Post-consultation comprehensive analysis
- `src/lib/alerts/alert-deduplication.ts` - Logic to prevent duplicate alerts
- `src/lib/alerts/confidence-scorer.ts` - Alert confidence calculation

### API Routes
- `src/app/api/alerts/real-time/route.ts` - Real-time alert generation endpoint
- `src/app/api/alerts/post-consultation/route.ts` - Post-consultation analysis endpoint
- `src/app/api/alerts/manage/route.ts` - Alert acceptance/dismissal endpoint
- `src/app/api/alerts/patient/[id]/route.ts` - Patient-specific alerts endpoint

### Real-time System
- `src/services/real-time-monitor.ts` - Consultation monitoring and transcript processing
- `src/hooks/useRealTimeAlerts.ts` - React hook for real-time alert subscriptions
- `src/contexts/AlertContext.tsx` - Global alert state management

### UI Components
- `src/components/alerts/AlertToast.tsx` - Real-time toast notification component
- `src/components/alerts/UnifiedAlertDisplay.tsx` - Updated alert display component
- `src/components/alerts/AlertDashboard.tsx` - Main alerts dashboard
- `src/components/alerts/AlertIcon.tsx` - Alert type icon component
- `src/components/alerts/AlertActions.tsx` - Accept/dismiss/navigate actions

### Integration Points
- `src/app/consultation/[id]/page.tsx` - Add alerts tab to consultation modal
- `src/components/layout/Navbar.tsx` - Update alerts notification integration
- `src/app/patients/[id]/page.tsx` - Integrate alerts into patient workspace
- `src/app/page.tsx` - Dashboard alerts integration

### Services and Utilities
- `src/services/consultation-lifecycle.ts` - Detect consultation start/end states
- `src/lib/database/alerts-queries.ts` - Database operations for alerts
- `src/lib/utils/alert-helpers.ts` - Alert utility functions
- `src/lib/navigation/alert-navigation.ts` - One-click navigation logic

### Testing
- `tests/unit/lib/alerts/` - Unit tests for alert processing logic
- `tests/integration/api/alerts/` - API integration tests
- `tests/frontend/components/alerts/` - Component tests for alert UI
- `tests/e2e/alerts-workflow.test.ts` - End-to-end alert workflow testing

## Tasks

- [ ] 1.0 Database Schema Updates and Alert Infrastructure
  - [ ] 1.1 Analyze existing alerts schema in patients table and complex alerts mock system
  - [ ] 1.2 Design unified alerts table schema with new alert types (COMORBIDITY, ASSESSMENT_QUESTION, DIAGNOSTIC_GAP, COMPLEX_CONDITION)
  - [ ] 1.3 Add metadata fields for confidence scores, source reasoning, related patient data references
  - [ ] 1.4 Add audit fields for acceptance, dismissal, and associated actions tracking
  - [ ] 1.5 Create database migration scripts for schema updates
  - [ ] 1.6 Update existing alert-related database queries to work with new schema
  - [ ] 1.7 Create indexes for performance optimization on alert queries

- [ ] 2.0 AI Model Integration and Processing Engine
  - [ ] 2.1 Research and implement GPT-4.1-mini API integration with proper configuration
  - [ ] 2.2 Research and implement GPT-o3 API integration for comprehensive analysis
  - [ ] 2.3 Create prompt templates for each alert category using mock data as few-shot examples
  - [ ] 2.4 Implement context management system for patient data and transcript processing
  - [ ] 2.5 Build confidence scoring system for alert relevance assessment
  - [ ] 2.6 Create alert deduplication logic to prevent retriggering existing alerts
  - [ ] 2.7 Implement error handling and fallback mechanisms for AI service failures

- [ ] 3.0 Real-time Alert System Implementation
  - [ ] 3.1 Create real-time consultation monitoring service
  - [ ] 3.2 Implement minute-by-minute transcript analysis with incremental processing
  - [ ] 3.3 Build real-time alert generation API endpoint
  - [ ] 3.4 Create React hook for real-time alert subscriptions
  - [ ] 3.5 Implement toast notification component with 8-second display and hover persistence
  - [ ] 3.6 Add real-time alert processing to consultation workflow
  - [ ] 3.7 Implement performance optimization to prevent consultation interface slowdown

- [ ] 4.0 Post-consultation Analysis System
  - [ ] 4.1 Implement consultation lifecycle detection (clinical engine run or save/close)
  - [ ] 4.2 Create comprehensive post-consultation analysis using GPT-o3
  - [ ] 4.3 Build alert refresh logic to retain only relevant alerts after consultation
  - [ ] 4.4 Implement alert persistence system for post-consultation alerts
  - [ ] 4.5 Create one-click navigation system for alert resolution
  - [ ] 4.6 Add proposed edit functionality for treatment plans and other clinical sections
  - [ ] 4.7 Implement audit trail for all alert actions and outcomes

- [ ] 5.0 User Interface and Alert Display Components
  - [ ] 5.1 Update existing CopilotDisplay component to work with unified alert system
  - [ ] 5.2 Create alert type-specific icons and visual indicators
  - [ ] 5.3 Integrate alerts into main dashboard with notification badge
  - [ ] 5.4 Add alerts tab to consultation modal
  - [ ] 5.5 Integrate alerts into patient workspace sections
  - [ ] 5.6 Implement accept/dismiss actions with proper state management
  - [ ] 5.7 Create comprehensive alert dashboard for managing all patient alerts
  - [ ] 5.8 Update navigation components to support alert-driven navigation 