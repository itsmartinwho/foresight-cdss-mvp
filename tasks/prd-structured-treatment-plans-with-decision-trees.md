# PRD: Structured Treatment Plans with Decision Trees and Enhanced Rendering

## Introduction/Overview

Currently, the Foresight CDSS clinical engine generates diagnosis and treatments in a single step, which can result in treatment information not displaying properly if it's not in the expected JSON format. This feature will restructure the clinical engine to separate treatment generation into its own dedicated step with structured outputs, implement streaming and advanced rendering capabilities (charts, tables, decision trees) for both diagnosis and treatment sections, and ensure compatibility with various EHR data formats.

The goal is to create a robust treatment planning system that can handle diverse data formats, generate visual decision trees based on clinical guidelines, and provide an enhanced user experience with real-time streaming and rich content rendering.

## Goals

1. **Separate Treatment Generation**: Unbundle treatment planning from the current clinical engine into a dedicated sequential step with structured JSON outputs
2. **Enhanced Data Compatibility**: Support treatment data in JSON, plain text, table format, and other EHR-compatible formats
3. **Rich Content Rendering**: Implement streaming markdown with charts, tables, and decision tree support for diagnosis and treatment sections
4. **Decision Tree Visualization**: Generate flowcharts showing treatment decision paths based on clinical guidelines
5. **Dual Storage Architecture**: Maintain both clean text and rich content versions in the database for EHR compatibility and product display
6. **Clinical Guidelines Integration**: Ensure diagnosis and treatment recommendations are informed by RAG-retrieved clinical guidelines
7. **Backward Compatibility**: Maintain support for existing encounter data while enhancing the system

## User Stories

1. **As a clinician**, I want to see treatment plans displayed correctly regardless of their original format (JSON, plain text, or EHR table) so that I can review all treatment information reliably
2. **As a clinical user**, I want to see treatment decision trees that show the logical flow from initial treatment through various branches based on patient response and clinical guidelines
3. **As a physician**, I want to edit treatment tables and text after the clinical engine runs while preserving charts and decision trees so I can customize recommendations while keeping visual aids
4. **As a medical professional**, I want to see which clinical guidelines informed specific diagnosis and treatment recommendations so I can understand the evidence base
5. **As an end user**, I want to see diagnosis and treatment content stream in real-time with proper formatting (like the medical advisor) so the interface feels responsive and professional
6. **As a healthcare administrator**, I want the system to output clean text versions for EHR integration while displaying rich content in the product interface
7. **As a demo user**, I want to see example decision trees and rich treatment content without the ability to edit them
8. **As an EHR integration user**, I want the system to parse and display treatment plans from various EHR formats consistently

## Functional Requirements

### Clinical Engine Restructuring
1. **FR-1**: The system must separate treatment generation into a sequential step that runs after diagnosis generation
2. **FR-2**: The treatment generation step must use a dedicated prompt specifically designed for structured treatment outputs
3. **FR-3**: The system must request JSON-structured outputs from the treatment generation step
4. **FR-4**: The treatment prompt must include instructions to generate decision tree flowcharts showing treatment pathways
5. **FR-5**: The system must support fallback parsing for non-JSON treatment data from EHR systems

### Data Storage and Format Support
6. **FR-6**: The system must create separate database fields for "clean text" and "rich content" versions of both diagnosis and treatments
7. **FR-7**: The system must parse and display treatment data in JSON, plain text, table format, and mixed formats
8. **FR-8**: The system must store charts, tables, and decision trees in a format renderable by Supabase and the frontend
9. **FR-9**: The rich content field must preserve all formatting, charts, and decision trees for product display
10. **FR-10**: The clean text field must contain only text content suitable for EHR system integration

### Streaming and Rendering Enhancement
11. **FR-11**: The system must implement chunk-based streaming for diagnosis and treatment sections (not differentials)
12. **FR-12**: The system must support rendering of charts, tables, and decision trees using the streaming markdown parser (smd.js)
13. **FR-13**: The system must provide different text editor components for diagnosis/treatment vs. transcript (rich content vs. plain text)
14. **FR-14**: The system must allow deletion of charts and decision trees as single blocks after clinical engine completion
15. **FR-15**: Tables and text content must remain editable after clinical engine completion (except in demo mode)

### Decision Tree Generation
16. **FR-16**: The system must automatically generate decision tree flowcharts for every treatment plan
17. **FR-17**: Decision trees must be based on clinical guidelines when available, or model training data as fallback
18. **FR-18**: Decision trees must show treatment pathways with branching logic based on patient response
19. **FR-19**: Decision trees must be visually distinct and rendered as flowchart diagrams
20. **FR-20**: In demo mode, decision trees must be generated once and stored to avoid regeneration

### Clinical Guidelines Integration
21. **FR-21**: The system must use RAG to retrieve relevant American clinical guidelines for diagnosis and treatment generation
22. **FR-22**: The system must display discrete indicators showing which guidelines informed specific recommendations
23. **FR-23**: Guidelines integration must be verifiable through visible references or citations
24. **FR-24**: The system must prioritize newer guidelines over older ones when multiple options exist

### Database and Backend Changes
25. **FR-25**: The encounters table must add fields for diagnosis_rich_content and treatments_rich_content
26. **FR-26**: The system must maintain backward compatibility with existing encounter records
27. **FR-27**: Database updates must be written to Supabase when content is edited and saved
28. **FR-28**: Frontend updates must reflect immediately without page refresh or aggressive cache clearing

### Demo Mode Considerations
29. **FR-29**: Demo mode must display non-editable charts, tables, and decision trees
30. **FR-30**: Demo mode must use pre-generated decision trees stored in the system
31. **FR-31**: Demo mode must showcase the new rich content capabilities without allowing modifications

## Non-Goals (Out of Scope)

1. **Making charts editable**: Charts will only support deletion, not in-place editing due to technical complexity
2. **Real-time collaborative editing**: Multiple users editing the same encounter simultaneously
3. **Custom decision tree creation**: Manual creation of decision trees by users
4. **Integration with specific EHR vendors**: Beyond format parsing, no vendor-specific integrations
5. **Streaming for differential diagnoses**: The existing differential diagnosis functionality is perfect as-is
6. **Mobile-specific optimizations**: Focus remains on desktop/web interface
7. **Offline functionality**: All features require internet connectivity
8. **Historical data migration**: Existing encounters will display using current logic, no automated upgrades

## Design Considerations

### Database Schema Changes
- Add `diagnosis_rich_content` JSONB field to encounters table
- Add `treatments_rich_content` JSONB field to encounters table  
- Rich content fields will store structured data including text, charts, tables, and decision tree definitions
- Clean text fields (existing `soap_note`, `treatments`) remain for EHR compatibility

### Frontend Component Architecture
- Reuse streaming markdown components from medical advisor (`smd.js`)
- Create new rich text editor components for diagnosis/treatment sections
- Implement chart/table deletion functionality with single-block selection
- Add decision tree rendering component using flowchart libraries

### Technical Implementation
- Extend `ClinicalEngineServiceV3` to add separate treatment generation step
- Create new treatment-specific prompt templates with decision tree instructions
- Implement parsing logic for multiple EHR treatment formats
- Add clinical guidelines RAG integration to treatment generation

## Technical Considerations

### Clinical Engine API Changes
- New `/api/clinical-engine/treatments` endpoint for separate treatment generation
- Enhanced prompts with guidelines context injection
- Structured JSON schema validation for treatment outputs
- Fallback parsing for non-structured treatment data

### Frontend Rendering Pipeline
- Integration with existing streaming markdown parser
- Decision tree rendering using Mermaid.js or similar flowchart library
- Real-time content updates with Supabase subscriptions
- Chart/table deletion with undo functionality

### Data Format Support
Research indicates EHR systems commonly use:
- **HL7 FHIR**: CarePlan and MedicationStatement resources in JSON format
- **CDA Documents**: XML-based treatment plans with structured sections
- **Claims Data**: Procedure codes and medication lists in tabular format
- **Plain Text**: Narrative treatment descriptions in clinical notes

The system must handle all these formats through intelligent parsing and normalization.

## Success Metrics

1. **Treatment Display Reliability**: 100% of treatments display correctly regardless of input format
2. **User Engagement**: 25% increase in time spent reviewing treatment plans due to enhanced visualization
3. **Clinical Accuracy**: Decision trees correctly represent clinical guideline recommendations in 95% of cases
4. **Performance**: Streaming treatment generation completes within 10 seconds for typical cases
5. **Data Integrity**: 100% of treatment edits save successfully to database with immediate frontend reflection
6. **EHR Compatibility**: Clean text outputs successfully integrate with test EHR systems
7. **Guidelines Integration**: Visible guideline references appear for 80% of generated recommendations

## Open Questions

1. **Decision Tree Complexity**: What is the optimal level of detail for treatment decision trees - high-level pathways or detailed step-by-step protocols?
2. **Chart Storage Format**: Should charts be stored as SVG, PNG, or structured data that renders on-demand?
3. **Guidelines Ranking**: How should the system prioritize between multiple relevant clinical guidelines?
4. **Performance Optimization**: What caching strategies should be implemented for frequently accessed guidelines?
5. **Error Handling**: How should the system behave when decision tree generation fails?
6. **User Permissions**: Should there be role-based restrictions on who can edit treatment plans?
7. **Version Control**: Should the system maintain history of treatment plan edits?
8. **Testing Strategy**: What test cases are needed to validate all EHR format parsing scenarios? 