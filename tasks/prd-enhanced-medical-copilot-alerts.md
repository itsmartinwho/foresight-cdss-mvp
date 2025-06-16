# Product Requirements Document: Enhanced Medical Co-pilot Alerts System

## Introduction/Overview

The Enhanced Medical Co-pilot Alerts System (Tool C Evolution) represents a comprehensive upgrade to the existing medical co-pilot implementation. This system will provide real-time AI-powered clinical decision support during consultations, analyzing patient data, consultation transcripts, and clinical patterns to generate high-confidence alerts for physicians. The system will integrate multiple alert types into a unified platform that supports both real-time consultation assistance and post-consultation comprehensive analysis.

**Problem Statement:** The current Tool C implementation relies on mock data and limited functionality. Physicians need a comprehensive, real-time clinical decision support system that can identify drug interactions, missing assessments, comorbidities, diagnostic gaps, and complex conditions using actual patient data and advanced AI analysis.

**Goal:** Create a production-ready, AI-powered medical co-pilot that provides actionable, high-confidence alerts to improve clinical decision-making and patient outcomes.

## Goals

1. **Unify Alert Systems:** Merge the existing complex alerts mock system with the new copilot alerts into a single, comprehensive alerts platform
2. **Real-time Clinical Support:** Provide minute-by-minute analysis of consultation transcripts with immediate, actionable alerts
3. **Comprehensive Post-consultation Analysis:** Conduct thorough review of completed consultations using advanced AI models
4. **Data-driven Accuracy:** Replace all mock data with real patient data while maintaining high alert confidence thresholds
5. **Seamless Clinical Workflow Integration:** Integrate alerts into existing patient workspaces and consultation flows
6. **Actionable Intelligence:** Provide not just alerts but specific, one-click actions for addressing identified issues

## User Stories

1. **As a physician during a consultation, I want to receive real-time alerts about potential drug interactions so that I can adjust treatment plans immediately**
2. **As a clinician, I want to be notified when I haven't asked important assessment questions relevant to the patient's condition so that I don't miss critical diagnostic information**
3. **As a healthcare provider, I want to be alerted to potential comorbidities based on patient symptoms and history so that I can provide comprehensive care**
4. **As a physician, I want the system to identify gaps in my preliminary diagnosis or treatment plan so that I can improve clinical outcomes**
5. **As a clinician, I want alerts to persist after consultations until I take action on them so that important issues aren't forgotten**
6. **As a healthcare provider, I want one-click actions from alerts that take me directly to the relevant section for editing so that I can efficiently address identified issues**
7. **As a physician, I want to see all alerts across patients in a unified dashboard so that I can prioritize and manage clinical decisions effectively**

## Functional Requirements

### Core Alert Processing
1. **Real-time Alert Generation:** The system must analyze consultation transcripts every minute using GPT-4.1-mini
2. **Post-consultation Comprehensive Analysis:** The system must perform thorough analysis using GPT-o3 after consultation completion
3. **High Confidence Threshold:** The system must only emit alerts when it has high degree of confidence in the findings
4. **Incremental Processing:** Real-time analysis must focus on new transcript content while maintaining full context
5. **Duplicate Prevention:** The system must not retrigger alerts that have already been generated

### Alert Categories
6. **Drug Interaction Alerts:** Detect potential interactions between current medications and proposed treatments
7. **Comorbidity Detection:** Identify potential comorbidities based on patient data and consultation content
8. **Assessment Question Alerts:** Suggest important questions the clinician should ask but hasn't addressed
9. **Diagnostic Gap Analysis:** Identify potential errors or gaps in preliminary diagnoses or treatment plans
10. **Complex Condition Alerts:** Flag potential difficult-to-diagnose illnesses based on symptom patterns

### Data Integration
11. **Real Patient Data Usage:** The system must use actual patient data from the database (demographics, conditions, lab results, medications, SOAP notes)
12. **Consultation Context:** Include patient history, current medications, existing conditions, and lab results in analysis
13. **Transcript Analysis:** Process consultation transcripts for clinical decision support
14. **Previous Alert Context:** Include previously generated alerts to prevent duplication

### User Interface & Experience
15. **Real-time Toast Notifications:** Display real-time alerts as disappearing toast notifications (8-second duration, extendable on hover)
16. **Alert Dashboard Integration:** Display all alerts in the main dashboard alerts tab and notification icon
17. **Patient Workspace Integration:** Show relevant alerts within patient workspace sections
18. **Consultation Modal Integration:** Add alerts tab to consultation modal displaying relevant alerts
19. **Alert Type Icons:** Display distinct icons for different alert categories

### Alert Lifecycle Management
20. **Alert Persistence:** Maintain alerts after consultation completion until clinician action
21. **Alert Refresh Logic:** Re-evaluate alerts post-consultation and retain only relevant ones
22. **Accept/Dismiss Actions:** Allow clinicians to accept or dismiss alerts
23. **One-click Navigation:** Accepting alerts must navigate to relevant sections with proposed edits
24. **Audit Trail:** Maintain history of dismissed/accepted alerts for audit purposes

### Technical Implementation
25. **Database Schema Updates:** Modify existing alerts schema to accommodate new alert types and metadata
26. **API Integration:** Implement GPT-4.1-mini for real-time processing and GPT-o3 for comprehensive analysis
27. **Consultation Lifecycle Detection:** Automatically detect consultation completion (clinical engine run or consultation save/close)
28. **Performance Optimization:** Ensure real-time processing doesn't impact consultation performance

## Non-Goals (Out of Scope)

1. **User Feedback System:** Alert accuracy feedback mechanisms (noted for future implementation)
2. **Historical Transcript Analysis:** Analysis of previous consultation transcripts (current consultation only)
3. **Alert Prioritization:** Complex alert ranking systems beyond chronological order
4. **Custom Alert Rules:** User-defined alert criteria or thresholds
5. **Integration with External Systems:** Third-party EHR or clinical systems beyond current architecture
6. **Mobile-specific Optimizations:** Native mobile app features (web-responsive only)
7. **Multi-language Support:** Non-English consultation transcript analysis

## Design Considerations

### User Interface
- **Toast Notification Design:** Non-intrusive, positioned to avoid interference with consultation workflow
- **Alert Icons:** Distinct, medical-appropriate iconography for each alert type
- **Dashboard Integration:** Seamless integration with existing alerts UI without disrupting current workflows
- **Consultation Modal:** New alerts tab that follows existing modal design patterns

### Information Architecture
- **Alert Categorization:** Clear grouping by type (drug interactions, comorbidities, assessment questions, diagnostic gaps, complex conditions)
- **Contextual Display:** Show alerts in relevant sections (medications alerts in treatment plan, assessment questions in consultation notes)
- **Historical Context:** Access to alert history without cluttering active alert views

## Technical Considerations

### AI Model Integration
- **GPT-4.1-mini Configuration:** Real-time processing with 1M token context window, optimized for speed and cost
- **GPT-o3 Implementation:** Comprehensive analysis with full patient context and alert history
- **Prompt Engineering:** Few-shot prompts using converted mock data as examples for alert identification patterns
- **Context Management:** Efficient token usage for large patient histories and transcripts

### Database Schema Changes
- **Alert Types Expansion:** Add new alert type enums (COMORBIDITY, ASSESSMENT_QUESTION, DIAGNOSTIC_GAP, COMPLEX_CONDITION)
- **Metadata Fields:** Add confidence scores, source reasoning, related patient data references
- **Audit Fields:** Track alert acceptance, dismissal, and associated actions
- **Performance Indexes:** Optimize for frequent alert queries by patient and consultation

### Performance & Scalability
- **Real-time Processing:** Asynchronous processing to avoid blocking consultation workflow
- **Rate Limiting:** Appropriate API rate limits for both GPT models
- **Caching Strategy:** Cache patient data and previous alerts to reduce processing overhead
- **Error Handling:** Graceful degradation when AI services are unavailable

### Integration Points
- **Existing Alert System:** Merge with current complex alerts infrastructure
- **Consultation Workflow:** Integration with clinical engine triggers and consultation lifecycle
- **Patient Data Pipeline:** Access to all relevant patient data sources (conditions, medications, labs, SOAP notes)

## Success Metrics

1. **Alert Accuracy:** >85% of generated alerts deemed clinically relevant by physicians
2. **Response Time:** Real-time alerts generated within 30 seconds of transcript updates
3. **Clinical Impact:** Measurable improvement in clinical decision-making through alert adoption
4. **User Adoption:** >70% of active clinicians regularly engaging with alert recommendations
5. **System Performance:** <2 second impact on consultation interface performance
6. **Alert Resolution:** >60% of alerts resulting in clinical action (accept with follow-through)
7. **False Positive Rate:** <15% of alerts dismissed as irrelevant

## Open Questions

1. **Alert Volume Management:** Should there be limits on the number of simultaneous real-time alerts to prevent alert fatigue?
2. **Consultation State Detection:** What constitutes the definitive end of a consultation for triggering comprehensive analysis?
3. **Error Recovery:** How should the system handle API failures during critical consultation moments?
4. **Data Privacy:** Are there additional privacy considerations for AI analysis of patient transcripts?
5. **Training Data:** Should the system learn from clinician feedback patterns to improve future alert accuracy?
6. **Integration Timeline:** Should the migration from mock alerts to real alerts be gradual or immediate?
7. **Backup Scenarios:** What fallback mechanisms should exist if AI services are temporarily unavailable?
8. **Multi-consultation Scenarios:** How should the system handle overlapping or concurrent consultations for the same patient? 