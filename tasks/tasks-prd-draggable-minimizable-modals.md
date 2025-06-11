# Task List: Draggable and Minimizable Modals Implementation

Based on: `tasks/prd-draggable-minimizable-modals.md`

## Relevant Files
- `src/hooks/useModalDragAndMinimize.tsx` - Core hook providing drag and minimize functionality
- `src/components/ui/modal-manager.tsx` - Global modal management and minimized modal container
- `src/components/ui/draggable-modal-wrapper.tsx` - Higher-order component wrapping existing modals
- `src/components/ui/minimized-modal-bar.tsx` - Bottom bar component displaying minimized modals
- `src/components/ui/dialog.tsx` - Updated to support drag and minimize functionality
- `src/components/ui/alert-dialog.tsx` - Updated to support drag and minimize functionality  
- `src/components/ui/sheet.tsx` - Updated to support drag and minimize functionality
- `src/components/guidelines/GuidelineModal.tsx` - Updated to support drag and minimize functionality
- `src/components/modals/ConsultationPanel.tsx` - Updated to support drag and minimize functionality
- `src/components/modals/NewConsultationModal.tsx` - Updated to support drag and minimize functionality
- `src/styles/modal-drag.css` - CSS animations and styles for drag and minimize behavior
- `src/types/modal.ts` - TypeScript interfaces for modal positioning and state
- `tests/unit/hooks/useModalDragAndMinimize.test.tsx` - Unit tests for the core hook
- `tests/integration/modal-drag-minimize.test.tsx` - Integration tests for drag and minimize functionality

## Tasks

- [x] 1.0 Core Infrastructure Setup
  - [x] 1.1 Create TypeScript interfaces for modal positioning and drag state
  - [x] 1.2 Create core drag and minimize hook with event handlers
  - [x] 1.3 Implement modal position persistence using sessionStorage
  - [x] 1.4 Create global modal management context for state coordination
  - [x] 1.5 Add CSS classes and animations for drag behavior and transitions

- [x] 2.0 Draggable Modal Wrapper Component
  - [x] 2.1 Create higher-order component that adds drag functionality to any modal
  - [x] 2.2 Implement mouse event handlers for drag initiation and movement
  - [x] 2.3 Add viewport boundary constraints and collision detection
  - [x] 2.4 Implement visual feedback during drag operations (cursor, opacity)
  - [x] 2.5 Add keyboard accessibility support for drag operations

- [x] 3.0 Minimization System
  - [x] 3.1 Create minimized modal bar component for bottom of screen
  - [x] 3.2 Implement minimize button and minimize/restore functionality
  - [x] 3.3 Create minimized modal representation with title and icon
  - [x] 3.4 Add horizontal layout management for multiple minimized modals
  - [x] 3.5 Implement click-to-restore functionality from minimized state

- [x] 4.0 Integration with Existing Modal Components
  - [x] 4.1 Update Dialog component to use draggable wrapper
  - [x] 4.2 Update AlertDialog component to use draggable wrapper
  - [x] 4.3 Update Sheet component to use draggable wrapper
  - [x] 4.4 Update GuidelineModal to use draggable wrapper and preserve existing functionality
  - [x] 4.5 Update ConsultationPanel to use draggable wrapper and preserve existing functionality
  - [x] 4.6 Update NewConsultationModal to use draggable wrapper

- [x] 5.0 Testing and Validation
  - [x] 5.1 Create unit tests for drag and minimize hook functionality
  - [x] 5.2 Create integration tests for modal drag behavior across different components
  - [x] 5.3 Test keyboard accessibility and screen reader compatibility
  - [x] 5.4 Test browser compatibility and window resize handling
  - [x] 5.5 Perform end-to-end testing using browser automation

- [x] 6.0 Documentation and Polish
  - [x] 6.1 Update component documentation with drag and minimize features
  - [x] 6.2 Add keyboard shortcut documentation for accessibility
  - [x] 6.3 Create user guide for modal management features
  - [x] 6.4 Performance optimization and final polish
  - [x] 6.5 Update existing tests to ensure no regressions 