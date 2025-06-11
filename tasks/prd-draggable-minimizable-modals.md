# Product Requirements Document: Draggable and Minimizable Modals

## Introduction/Overview

This feature will enhance the modal user experience by making all modals in the Foresight CDSS application draggable and minimizable. Users will be able to reposition modals anywhere within the viewport and minimize them to a compact representation at the bottom of the screen, allowing for better workflow management and reduced visual obstruction when working with multiple modals.

**Problem Solved**: Currently, modals appear in fixed positions and can block important content, forcing users to close them to access underlying information. This creates workflow interruptions and reduces productivity.

**Goal**: Implement draggable and minimizable functionality across all modal components to improve user workflow efficiency and multitasking capabilities.

## Goals

1. **Enhance User Workflow**: Allow users to position modals optimally without blocking important content
2. **Improve Multitasking**: Enable users to keep multiple modals accessible while working
3. **Maintain Accessibility**: Ensure all functionality works with keyboard navigation and screen readers
4. **Preserve Performance**: Implement dragging and minimization without impacting application performance
5. **Consistent Experience**: Provide uniform behavior across all modal types
6. **Persist User Preferences**: Remember modal positions across page navigation

## User Stories

1. **As a clinician reviewing guidelines**, I want to drag the guideline modal to a corner of my screen so I can continue reading patient notes while keeping the guideline visible.

2. **As a user working with consultation data**, I want to minimize the consultation panel to access other information quickly, then restore it when needed without losing my progress.

3. **As a physician comparing multiple guidelines**, I want to open several guideline modals and position them side by side for easy comparison.

4. **As a user multitasking**, I want to minimize multiple modals and see them represented as tabs at the bottom of my screen so I can quickly switch between them.

5. **As a keyboard user**, I want to use keyboard shortcuts to minimize/maximize and move modal focus without requiring mouse interaction.

## Functional Requirements

### Core Dragging Functionality
1. **The system must** provide a dedicated drag handle in the modal header/title bar area
2. **The system must** only allow dragging via the title bar area, not the entire modal content
3. **The system must** constrain modal movement within the viewport boundaries
4. **The system must** prevent dragging on interactive elements within the title bar (close button, minimize button, other controls)
5. **The system must** provide visual feedback during dragging (cursor changes, slight opacity change)
6. **The system must** snap modals back to their default center position when maximized after being minimized

### Minimization Functionality
7. **The system must** add a minimize button ("-") next to the existing close button ("×")
8. **The system must** display minimized modals as compact representations at the bottom of the screen
9. **The system must** show modal title and icon in the minimized representation
10. **The system must** arrange multiple minimized modals horizontally, with most recently minimized on the left
11. **The system must** allow users to restore modals by clicking on their minimized representation
12. **The system must** maintain modal content and state when minimized and restored

### Modal Management
13. **The system must** apply this functionality to all existing modal types:
    - Dialog components (`src/components/ui/dialog.tsx`)
    - Alert dialogs (`src/components/ui/alert-dialog.tsx`) 
    - Sheet components (`src/components/ui/sheet.tsx`)
    - Guideline modals (`src/components/guidelines/GuidelineModal.tsx`)
    - Consultation panels (`src/components/modals/ConsultationPanel.tsx`)
    - New consultation modals (`src/components/modals/NewConsultationModal.tsx`)
    - Transcript editor modals (`src/components/ui/editable/TranscriptEditorModal.tsx`)
    - Popover components (`src/components/ui/popover.tsx`)

14. **The system must** persist modal positions across page navigation within the same session
15. **The system must** reset modal positions when the browser session ends
16. **The system must** handle browser window resizing by keeping modals within bounds

### Accessibility
17. **The system must** maintain keyboard focus management for minimized/restored modals
18. **The system must** provide ARIA labels for minimize/restore functionality
19. **The system must** support keyboard shortcuts for minimize/maximize operations
20. **The system must** announce state changes to screen readers

### Technical Implementation
21. **The system must** implement dragging using native HTML5 drag events or mouse events (not third-party libraries)
22. **The system must** store modal positions in component state or context
23. **The system must** use CSS transforms for positioning to maintain performance
24. **The system must** integrate with existing Radix UI modal components without breaking functionality

## Non-Goals (Out of Scope)

1. **Mobile Device Support**: This feature is explicitly desktop-only as specified
2. **Modal Resizing**: Only position and minimize/maximize functionality, not resize handles
3. **Cross-Session Persistence**: Modal positions will not persist between browser sessions
4. **Modal Layering Controls**: No z-index management beyond existing behavior
5. **Animation Customization**: Standard animation patterns only
6. **Critical System Modals**: Authentication or critical error dialogs should NOT be draggable/minimizable (noted for future reference)
7. **Third-Party Libraries**: No new drag-and-drop libraries should be added

## Design Considerations

### Visual Design
- Minimize button should use consistent styling with existing close button
- Minimized modal representations should use the existing `glass` styling patterns
- Drag handle should be clearly indicated (title bar background change on hover)
- Maintain existing `glass-backdrop`, `glass`, and `glass-dense` visual effects

### Title Bar Requirements
- Title bar must be clearly distinguishable as the drag handle
- Minimize button placement: to the left of the close button
- Icon representation in minimized state should match modal type (guideline source icons, etc.)

### Layout Management
- Minimized modals container: fixed position at bottom of viewport
- Horizontal layout with 8px gaps between minimized modals
- Maximum width for minimized representations: 200px
- Overflow handling: horizontal scroll if too many minimized modals

## Technical Considerations

### Integration Points
- **Radix UI Components**: Must work with existing `@radix-ui/react-dialog` implementations
- **Styling System**: Integrate with existing Tailwind CSS and glass morphism effects
- **State Management**: Leverage existing modal state patterns from `useGuidelines.tsx` hook
- **Component Architecture**: Extend existing modal wrapper components

### Performance Considerations
- Use `transform` CSS property for positioning (hardware accelerated)
- Implement event delegation for drag handling
- Debounce position updates during drag operations
- Minimize re-renders during drag operations

### Dependencies
- No new external dependencies required
- Leverage existing React hooks and state management patterns
- Utilize existing CSS animation classes (`tailwindcss-animate`)

## Success Metrics

1. **User Engagement**: Increase in modal usage time and interaction frequency
2. **Workflow Efficiency**: Reduction in modal open/close cycles during user sessions
3. **Feature Adoption**: 70%+ of users utilize drag functionality within first week of release
4. **Performance**: No measurable impact on modal open/close animation performance
5. **Accessibility Compliance**: 100% keyboard navigation compatibility maintained
6. **Error Rate**: Zero JavaScript errors related to modal positioning or state management

## Open Questions

1. **Keyboard Shortcuts**: What specific key combinations should be used for minimize/maximize? (Suggestion: Ctrl/Cmd + M for minimize, Escape to close as existing)
2. **Maximum Minimized Modals**: Should there be a limit to prevent UI overflow? (Suggestion: 6-8 maximum with overflow scroll)
3. **Default Positions**: Should certain modal types have preferred default positions? (e.g., guidelines in top-right)
4. **Touch Device Fallback**: Even though desktop-only, should touch events be handled gracefully for hybrid devices?
5. **Animation Timing**: What duration should be used for minimize/maximize transitions to feel responsive? (Suggestion: 200ms) 