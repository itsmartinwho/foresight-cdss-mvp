# Product Requirements Document: Differential Diagnoses Display and Integration

## Introduction/Overview

This feature implements the generation and display of differential diagnoses within the Foresight CDSS platform. The system will generate up to 5 differential diagnoses with likelihood scores, explanations, supporting evidence, and ICD-11 codes. These diagnoses will be displayed in real-time during the clinical engine processing in the consultation modal and integrated into the patient workspace diagnosis section. A reasoning model will synthesize a final diagnosis based on all available information including the differential diagnoses, patient history, consultation transcript, and clinical notes.

**Goal:** Enhance clinical decision-making by providing structured, evidence-based differential diagnoses that inform the final diagnosis and treatment planning process.

## Goals

1. **Real-time Clinical Insights:** Display differential diagnoses as they become available during clinical engine processing
2. **Evidence-based Decision Making:** Provide likelihood scores, explanations, and supporting evidence for each differential diagnosis
3. **Structured Medical Coding:** Include accurate ICD-11 codes and descriptions for proper medical documentation
4. **Intelligent Synthesis:** Generate comprehensive final diagnoses through reasoning model integration
5. **User Control:** Allow manual editing of all diagnostic information after automated processing completes

## User Stories

1. **As a clinician reviewing a consultation,** I want to see potential differential diagnoses with likelihood scores so that I can consider multiple diagnostic possibilities systematically.

2. **As a healthcare provider,** I want to see the reasoning and supporting evidence behind each differential diagnosis so that I can validate the clinical reasoning process.

3. **As a medical professional,** I want to access ICD-11 codes for each diagnosis so that I can ensure proper medical coding and documentation.

4. **As a clinician,** I want the system to synthesize a final diagnosis based on all available information so that I have a comprehensive diagnostic conclusion.

5. **As a healthcare provider,** I want to edit differential diagnoses and final diagnosis after processing so that I can correct or refine the automated suggestions.

6. **As a clinician monitoring a consultation,** I want to see diagnostic information appear in real-time so that I can follow the clinical reasoning process as it develops.

## Functional Requirements

1. **Differential Diagnosis Generation:**
   1.1. The system must generate up to 5 differential diagnoses per consultation
   1.2. Each differential diagnosis must include: likelihood score (percentage), clinical explanation, supporting evidence, and ICD-11 code(s) with descriptions
   1.3. Differential diagnoses must be ordered by likelihood from highest to lowest
   1.4. The system must support multiple ICD-11 codes per diagnosis when applicable

2. **Real-time Display:**
   2.1. Differential diagnoses must appear in the consultation modal as soon as they are generated
   2.2. The diagnosis tab must become visible when differential diagnoses are available
   2.3. Content must update progressively as the clinical engine processes information

3. **Final Diagnosis Synthesis:**
   3.1. A reasoning model must synthesize the final diagnosis based on patient history, consultation transcript, clinical notes, and differential diagnoses
   3.2. The system must provide explanations when the final diagnosis differs from or combines differential diagnoses
   3.3. The final diagnosis must always be generated after the clinical engine completes processing

4. **User Interface:**
   4.1. Differential diagnoses must be displayed in card format with visual likelihood indicators
   4.2. Each card must show all available information: diagnosis name, likelihood percentage, explanation, evidence, and ICD-11 codes
   4.3. Visual indicators (colors, progress bars) must represent likelihood levels
   4.4. The interface must integrate with existing diagnosis and treatment plan sections

5. **User Interaction:**
   5.1. All diagnostic fields must be editable after the clinical engine completes processing
   5.2. Editing must follow the same pattern as transcription editing (only available when processing is complete)
   5.3. Users must be able to modify or delete portions of differential diagnoses and final diagnosis text

6. **Integration Requirements:**
   6.1. The feature must integrate with the existing clinical engine workflow
   6.2. Differential diagnoses must appear in both consultation modal and patient workspace diagnosis section
   6.3. The system must work with current API endpoints or implement new ones as needed

7. **Data Requirements:**
   7.1. Each differential diagnosis must store: diagnosis text, likelihood score, explanation, supporting evidence, ICD-11 codes, and descriptions
   7.2. Final diagnosis must store: diagnosis text, reasoning explanation, and reference to contributing differential diagnoses
   7.3. All diagnostic data must be persisted and retrievable for future consultation reviews

## Non-Goals (Out of Scope)

1. **RAG System Integration:** External medical reference retrieval systems are not included; models will cite internal knowledge
2. **Search and Filtering:** No search or filtering functionality within differential diagnoses
3. **Role-based Permissions:** No user role restrictions for viewing diagnostic information
4. **Advanced Analytics:** No performance metrics or analytics dashboard for diagnostic accuracy
5. **Real-time Collaboration:** No multi-user editing or collaboration features
6. **Mobile Optimization:** Focus is on desktop/web interface only
7. **Integration with External EMR Systems:** No direct integration with third-party electronic medical record systems

## Design Considerations

- **Card Layout:** Differential diagnoses should be presented as visually distinct cards
- **Likelihood Visualization:** Use progress bars, color coding, or percentage displays for likelihood scores
- **Information Hierarchy:** Clear visual hierarchy with diagnosis name prominent, followed by likelihood, explanation, and supporting details
- **Responsive Design:** Ensure proper display within existing modal and workspace constraints
- **Consistent Styling:** Match existing UI patterns for diagnosis and treatment sections
- **Loading States:** Show appropriate loading indicators during real-time processing

## Technical Considerations

- **API Integration:** Research current clinical engine APIs and reasoning model capabilities for latest LLM implementations
- **Data Structure:** Define schema for differential diagnosis objects including all required fields
- **State Management:** Handle real-time updates and progressive loading of diagnostic information
- **ICD-11 Integration:** Verify existing ICD-11 code lookup functionality and implement if missing
- **Performance:** Ensure efficient rendering of multiple diagnostic cards with rich content
- **Error Handling:** Graceful handling of cases where differential diagnoses cannot be generated

## Success Metrics

1. **Clinical Efficiency:** Reduce diagnostic consideration time by providing structured differential diagnoses
2. **Diagnostic Accuracy:** Enable more comprehensive diagnostic processes through systematic differential consideration
3. **User Adoption:** High utilization of differential diagnosis information in clinical decision-making
4. **Documentation Quality:** Improved ICD-11 coding accuracy through automated code suggestions
5. **Workflow Integration:** Seamless integration with existing consultation and patient workspace workflows

## Open Questions

1. **Current Implementation Status:** What differential diagnosis logic currently exists in the clinical engine?
2. **API Endpoints:** Are there existing API endpoints for differential diagnosis generation, or do new ones need to be created?
3. **ICD-11 Integration:** Is the ICD-11 code lookup functionality already implemented and functional?
4. **Reasoning Model Integration:** What is the current state of the reasoning model that will synthesize final diagnoses?
5. **Data Migration:** Are there existing consultations that need to be updated with the new differential diagnosis structure?
6. **Performance Testing:** What are the expected response times for differential diagnosis generation?
7. **Clinical Validation:** Should there be a clinical review process for the automated differential diagnosis logic? 