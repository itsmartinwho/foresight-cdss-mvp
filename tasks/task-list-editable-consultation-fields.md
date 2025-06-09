# Task List: Editable Consultation Fields Implementation

**Related PRD:** [prd-editable-consultation-fields.md](./prd-editable-consultation-fields.md)

## Phase 1: Core Infrastructure & UI Components

### Task 1.1: Create Editable Field Components
**Priority:** High  
**Estimated Time:** 4-6 hours  
**Dependencies:** None

Create reusable components for different field types with hover-to-edit functionality:
- `EditableTextField` - For simple text inputs (reason for visit)
- `EditableDateTimeField` - For date/time selection 
- `EditableRichTextField` - For rich text content (SOAP notes)
- `EditableSection` - Container component with hover edit button

**Implementation Details:**
- Follow differential diagnosis UI patterns for save/cancel/undo/redo controls
- Include validation for required fields
- Handle unsaved changes state
- Support keyboard shortcuts (Ctrl+Enter to save, Escape to cancel)

**Acceptance Criteria:**
- [ ] Components render with hover edit button
- [ ] Edit mode shows appropriate input controls
- [ ] Save/cancel/undo/redo buttons work correctly
- [ ] Components handle validation errors appropriately
- [ ] Keyboard shortcuts function as expected

### Task 1.2: Create Rich Text Editor for SOAP Notes
**Priority:** High  
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 1.1

Implement rich text editing for individual SOAP sections (Subjective, Objective, Assessment, Plan):
- Create `SOAPNoteEditor` component with separate editors for each section
- Support rich text formatting (bold, italic, lists)
- Include undo/redo functionality per section
- Handle save/cancel for each section independently

**Implementation Details:**
- Use existing RichTextEditor component as base
- Parse existing SOAP note text into S, O, A, P sections
- Allow editing each section individually
- Reconstruct full SOAP note on save

**Acceptance Criteria:**
- [ ] SOAP note displays as separate editable sections
- [ ] Each section can be edited independently
- [ ] Rich text formatting works correctly
- [ ] Save reconstructs proper SOAP note format
- [ ] Undo/redo works per section

### Task 1.3: Create Transcript Modal Editor
**Priority:** Medium  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1.1

Create modal for transcript editing:
- Design modal with rich text editor for full transcript
- Include save/cancel/undo/redo controls
- Handle large transcript content efficiently
- Support search within transcript

**Implementation Details:**
- Modal opens when transcript section edit is clicked
- Full-screen rich text editor for transcript content
- Modal includes standard save/cancel controls
- Prevent accidental closure with unsaved changes

**Acceptance Criteria:**
- [ ] Modal opens correctly for transcript editing
- [ ] Rich text editor loads transcript content
- [ ] Save/cancel controls work as expected
- [ ] Modal prevents closure with unsaved changes
- [ ] Large transcripts load and perform well

## Phase 2: Data Management & API Integration

### Task 2.1: Create Field Update API Endpoints
**Priority:** High  
**Estimated Time:** 4-5 hours  
**Dependencies:** None

Create API endpoints for updating individual consultation fields:
- `PATCH /api/encounters/[id]/basic-info` - Update reason, date/time
- `PATCH /api/encounters/[id]/soap-note` - Update SOAP note
- `PATCH /api/encounters/[id]/transcript` - Update transcript
- Handle validation and error responses

**Implementation Details:**
- Follow existing API patterns in `/src/app/api/`
- Update encounters table via SupabaseDataService
- Validate required fields (date/time presence)
- Return updated encounter data
- Handle database constraint violations

**Acceptance Criteria:**
- [ ] Endpoints update database correctly
- [ ] Validation prevents invalid data
- [ ] Error handling returns appropriate responses
- [ ] Updated data reflects in UI immediately
- [ ] Database constraints are respected

### Task 2.2: Implement Extra Data Synchronization
**Priority:** Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 2.1

Update `extra_data` JSONB field when consultation fields change:
- Identify fields that feed into `extra_data`
- Create synchronization logic for field updates
- Implement one-time migration for stale data
- Ensure future updates maintain synchronization

**Implementation Details:**
- Analyze current `extra_data` structure and dependencies
- Create utility function to rebuild `extra_data` from current fields
- Add hooks to API endpoints to update `extra_data`
- Create migration script for existing encounters

**Acceptance Criteria:**
- [ ] `extra_data` updates when consultation fields change
- [ ] Migration script updates stale `extra_data` successfully
- [ ] Medical advisor receives updated data
- [ ] No performance degradation from synchronization
- [ ] Data integrity maintained across all systems

### Task 2.3: Enhance SupabaseDataService for Field Updates
**Priority:** High  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 2.1, Task 2.2

Extend SupabaseDataService to support field-level updates:
- Add methods for updating individual encounter fields
- Update local cache when fields are modified
- Emit change events for UI updates
- Handle optimistic updates with rollback on failure

**Implementation Details:**
- Add methods like `updateEncounterBasicInfo`, `updateSOAPNote`, etc.
- Update local cache immediately for responsive UI
- Emit change events to refresh dependent components
- Implement error handling with cache rollback

**Acceptance Criteria:**
- [ ] Service methods update database and cache
- [ ] UI reflects changes immediately
- [ ] Error states roll back optimistic updates
- [ ] Other components receive update notifications
- [ ] Data consistency maintained between cache and database

## Phase 3: UI Integration & User Experience

### Task 3.1: Integrate Editable Fields in ConsolidatedConsultationTab
**Priority:** High  
**Estimated Time:** 4-5 hours  
**Dependencies:** Task 1.1, Task 1.2, Task 2.3

Replace static displays with editable components in the consultation tab:
- Update encounter header with editable reason and date/time
- Replace SOAP note display with rich text editors
- Add edit button to transcript section
- Maintain existing layout and styling

**Implementation Details:**
- Replace static text with editable components
- Position edit buttons according to design specifications
- Ensure proper spacing and alignment
- Handle loading and error states
- Maintain responsive design

**Acceptance Criteria:**
- [ ] All specified fields show edit buttons on hover
- [ ] Editable components integrate seamlessly with existing layout
- [ ] Edit states don't break responsive design
- [ ] Loading and error states display correctly
- [ ] Visual consistency maintained with rest of application

### Task 3.2: Implement Unsaved Changes Warning System
**Priority:** Medium  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 3.1

Create system to warn users about unsaved changes:
- Track unsaved changes across all editable fields
- Show warning modal when navigating away
- Provide save/discard options in warning
- Clear warnings when changes are saved

**Implementation Details:**
- Use React context or state management for tracking changes
- Hook into navigation events to show warnings
- Create reusable warning modal component
- Handle browser refresh/close events

**Acceptance Criteria:**
- [ ] Warning shows when navigating with unsaved changes
- [ ] Modal offers save/discard options
- [ ] Saving changes clears warning state
- [ ] Browser events trigger appropriate warnings
- [ ] Warning doesn't show for saved changes

### Task 3.3: Update AllDataViewTab with Editable Fields
**Priority:** Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 1.1, Task 2.3

Extend editable functionality to the All Data tab:
- Apply same editable components to all data view
- Ensure consistency between consultation and all data tabs
- Handle multiple encounters in edit mode
- Update data synchronization across tabs

**Implementation Details:**
- Reuse editable components from consultation tab
- Handle different data contexts (single vs. multiple encounters)
- Maintain state synchronization between tabs
- Ensure visual consistency

**Acceptance Criteria:**
- [ ] All Data tab fields are editable with same functionality
- [ ] Changes reflect immediately in both tabs
- [ ] Multi-encounter editing works correctly
- [ ] Visual consistency maintained across tabs
- [ ] No data conflicts between tabs

## Phase 4: Advanced Features & Polish

### Task 4.1: Implement Clinical Trials and Prior Auth Editing
**Priority:** Low  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1.1, Task 2.1

Add editing capability for placeholder sections:
- Create editable components for clinical trials data
- Add editing for prior authorization fields
- Follow current mock data structure
- Prepare for future real data integration

**Implementation Details:**
- Analyze current mock data structures
- Create appropriate input components for each field type
- Handle placeholder vs. real data scenarios
- Design for future data source integration

**Acceptance Criteria:**
- [ ] Clinical trials section is editable
- [ ] Prior authorization fields can be modified
- [ ] Mock data structure is preserved
- [ ] Components ready for real data integration
- [ ] Edit functionality matches other sections

### Task 4.2: Add Keyboard Shortcuts and Accessibility
**Priority:** Medium  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 3.1, Task 3.2

Enhance user experience with keyboard navigation and accessibility:
- Implement keyboard shortcuts for common actions
- Add ARIA labels and roles for screen readers
- Ensure tab navigation works correctly
- Add focus management for edit modes

**Implementation Details:**
- Add keyboard event handlers for shortcuts
- Implement proper ARIA attributes
- Test with screen readers
- Add focus trapping in edit modes
- Document keyboard shortcuts for users

**Acceptance Criteria:**
- [ ] Common actions have keyboard shortcuts
- [ ] Screen readers can navigate editable fields
- [ ] Tab order is logical and complete
- [ ] Focus management works correctly
- [ ] Keyboard shortcuts are documented

### Task 4.3: Performance Optimization and Testing
**Priority:** Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** All previous tasks

Optimize performance and add comprehensive testing:
- Optimize re-renders for large datasets
- Add unit tests for editable components
- Create integration tests for save/cancel flows
- Performance test with large transcript content
- Add error boundary components

**Implementation Details:**
- Use React.memo and useMemo for optimization
- Create test suites for each component
- Test error scenarios and edge cases
- Profile performance with realistic data
- Add error boundaries for graceful failures

**Acceptance Criteria:**
- [ ] Components perform well with large datasets
- [ ] Unit tests cover all component functionality
- [ ] Integration tests verify save/cancel flows
- [ ] Error scenarios are handled gracefully
- [ ] Performance meets established benchmarks

## Phase 5: Documentation & Deployment

### Task 5.1: Update Documentation
**Priority:** Medium  
**Estimated Time:** 2-3 hours  
**Dependencies:** All implementation tasks

Update project documentation for new functionality:
- Document new editable field components
- Update user guide with editing instructions
- Add API documentation for new endpoints
- Update development guide with component usage

**Implementation Details:**
- Update existing documentation files
- Create component documentation with examples
- Document API endpoints and payloads
- Add troubleshooting guide for common issues

**Acceptance Criteria:**
- [ ] Component documentation is complete and accurate
- [ ] User guide explains editing functionality
- [ ] API documentation covers all new endpoints
- [ ] Development guide includes usage examples
- [ ] Troubleshooting guide addresses common issues

### Task 5.2: Final Testing and Bug Fixes
**Priority:** High  
**Estimated Time:** 2-4 hours  
**Dependencies:** All previous tasks

Comprehensive testing and bug resolution:
- End-to-end testing of all editing flows
- Cross-browser compatibility testing
- Mobile responsiveness verification
- Data integrity testing across tabs
- Performance testing under load

**Implementation Details:**
- Manual testing of all user scenarios
- Automated e2e test creation
- Browser compatibility verification
- Mobile device testing
- Load testing with multiple concurrent editors

**Acceptance Criteria:**
- [ ] All editing flows work correctly end-to-end
- [ ] Functionality works across supported browsers
- [ ] Mobile interface is functional and usable
- [ ] Data remains consistent across all views
- [ ] Performance is acceptable under normal load

---

## Summary

**Total Estimated Time:** 35-50 hours
**Critical Path:** Phase 1 → Phase 2 → Phase 3
**Key Dependencies:** 
- Task 1.1 (Core Components) blocks most UI tasks
- Task 2.1 (API Endpoints) blocks data management tasks
- Task 3.1 (UI Integration) blocks user experience tasks

**Success Metrics:**
- All consultation fields editable via hover interface
- Data consistency maintained across all views
- User experience matches differential diagnosis patterns
- Performance remains acceptable with large datasets
- No data loss during editing operations 