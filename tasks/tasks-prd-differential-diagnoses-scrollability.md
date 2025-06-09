# Task List: Differential Diagnoses Scrollability Fix

Based on PRD: `prd-differential-diagnoses-scrollability.md`

## Overview
This task list implements the requirements to fix the scrollability issue in the differential diagnoses list within the ConsultationPanel modal. The goal is to enable vertical scrolling for all 5 diagnosis cards while maintaining the fixed header and modal constraints.

## Relevant Files
- `src/components/modals/ConsultationPanel.tsx` - Main modal container with tab navigation and content area structure
- `src/components/diagnosis/DifferentialDiagnosesList.tsx` - Component containing the diagnosis cards that need scrolling
- `src/components/diagnosis/DifferentialDiagnosisCard.tsx` - Individual diagnosis card component (may need minor adjustments)
- `TESTING.md` - Documentation for manual testing procedures
- `docs/history.md` - Development documentation for the fix (see "Differential Diagnoses Scrollability Fix" section)

## Tasks

- [ ] 1.0 **Analyze and Fix Container Hierarchy**
  - [ ] 1.1 Inspect current CSS structure using browser DevTools
  - [ ] 1.2 Identify specific overflow/height constraint issues
  - [ ] 1.3 Document the exact problem areas in code
  - [ ] 1.4 Create implementation plan for container restructuring

- [ ] 2.0 **Implement Scrollable Container in DifferentialDiagnosesList**
  - [ ] 2.1 Update component to use proper flex layout structure
  - [ ] 2.2 Add overflow-y-auto to the scroll container with min-h-0
  - [ ] 2.3 Ensure header section stays fixed with flex-shrink-0
  - [ ] 2.4 Test component with 1, 3, and 5 diagnosis cards
  - [ ] 2.5 Verify proper spacing and padding in scroll area

- [ ] 3.0 **Update ConsultationPanel Container Structure**
  - [ ] 3.1 Remove conditional overflow-visible/overflow-hidden settings
  - [ ] 3.2 Set consistent overflow-hidden on parent containers
  - [ ] 3.3 Ensure proper height constraints for flexbox chain
  - [ ] 3.4 Test integration with updated DifferentialDiagnosesList
  - [ ] 3.5 Verify other tabs (transcript, diagnosis, treatment) still work

- [ ] 4.0 **Testing and Cross-Browser Validation**
  - [ ] 4.1 Test scrolling functionality on 13-inch MacBook Air display
  - [ ] 4.2 Verify all 5 differential diagnosis cards are accessible
  - [ ] 4.3 Confirm header remains fixed during scrolling
  - [ ] 4.4 Test in Chrome, Firefox, and Safari browsers
  - [ ] 4.5 Test demo mode functionality specifically
  - [ ] 4.6 Test with different window sizes and zoom levels

- [ ] 5.0 **Documentation and Code Cleanup**
  - [ ] 5.1 Update TESTING.md with new scrollability test procedures
  - [ ] 5.2 Remove any debug code, borders, or console.log statements
  - [ ] 5.3 Commit changes with descriptive commit messages
  - [ ] 5.4 Update development notes documentation
  - [ ] 5.5 Verify code follows project style guidelines 