# Task List: Structured Treatment Plans with Decision Trees and Enhanced Rendering

Based on PRD: `prd-structured-treatment-plans-with-decision-trees.md`

## Relevant Files
- `scripts/schema.sql` - Add new database fields for rich content storage
- `src/lib/clinicalEngineServiceV3.ts` - Extend clinical engine with separate treatment step
- `src/lib/ai/prompt-templates.ts` - Add treatment-specific prompts with decision tree instructions
- `src/components/modals/ConsultationPanel.tsx` - Update treatment rendering and editing
- `src/components/ui/rich-treatment-editor.tsx` - New rich text editor for treatments (to be created)
- `src/components/ui/decision-tree-renderer.tsx` - New decision tree visualization component (to be created)
- `src/components/advisor/streaming-markdown/treatment-renderer.tsx` - Treatment-specific streaming renderer (to be created)
- `src/api/clinical-engine/treatments/route.ts` - New API endpoint for treatment generation (to be created)
- `src/lib/types.ts` - Update type definitions for rich content
- `src/hooks/useEditableEncounterFields.ts` - Update for rich content editing
- `src/services/guidelines/treatment-guidelines-service.ts` - RAG integration for treatment guidelines (to be created)

## Tasks

- [x] 1.0 Database Schema and Backend Infrastructure
  - [x] 1.1 Add diagnosis_rich_content and treatments_rich_content JSONB fields to encounters table
  - [x] 1.2 Create database migration script with backward compatibility
  - [x] 1.3 Update type definitions in types.ts to include rich content fields
  - [x] 1.4 Test database changes with existing encounter data

- [x] 2.0 Clinical Engine Restructuring
  - [x] 2.1 Create separate treatment generation step in ClinicalEngineServiceV3
  - [x] 2.2 Design treatment-specific prompts with decision tree instructions
  - [x] 2.3 Implement structured JSON output validation for treatments
  - [x] 2.4 Add fallback parsing for non-JSON EHR treatment formats
  - [x] 2.5 Create new /api/clinical-engine/treatments endpoint
  - [x] 2.6 Integrate RAG-based clinical guidelines retrieval for treatments
  - [x] 2.7 Test clinical engine with various input formats

- [x] 3.0 Rich Content Rendering and Streaming
  - [x] 3.1 Create treatment-specific streaming markdown renderer extending smd.js
  - [x] 3.2 Implement decision tree rendering component using Mermaid.js or similar
  - [x] 3.3 Create rich text editor component for diagnosis and treatment sections
  - [x] 3.4 Add chart and table deletion functionality with single-block selection
  - [x] 3.5 Implement streaming for diagnosis and treatment tabs (not differentials)
  - [x] 3.6 Test rich content rendering with various markdown formats

- [ ] 4.0 Frontend Integration and User Experience
  - [ ] 4.1 Update ConsultationPanel to use new rich content editors
  - [ ] 4.2 Implement dual storage (clean text + rich content) editing workflow
  - [ ] 4.3 Add clinical guidelines reference indicators in UI
  - [ ] 4.4 Create demo mode with non-editable rich content
  - [ ] 4.5 Update real-time save functionality for rich content fields
  - [ ] 4.6 Implement immediate frontend updates without cache clearing
  - [ ] 4.7 Test complete user workflow from treatment generation to editing

- [ ] 5.0 Testing and Validation
  - [ ] 5.1 Create test cases for multiple EHR format parsing
  - [ ] 5.2 Test decision tree generation with various clinical scenarios
  - [ ] 5.3 Validate backward compatibility with existing encounters
  - [ ] 5.4 Test streaming performance and error handling
  - [ ] 5.5 Verify clinical guidelines integration and citation display
  - [ ] 5.6 End-to-end testing with browserbase for complete user workflows
  - [ ] 5.7 Performance testing for large treatment plans and complex decision trees 