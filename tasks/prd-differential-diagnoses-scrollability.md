# Product Requirements Document: Differential Diagnoses Scrollability Fix

## Introduction/Overview

The differential diagnoses list in the ConsultationPanel modal currently does not support vertical scrolling, preventing users from viewing all available diagnosis cards. The issue manifests as content being cut off with no visible scrollbar, making diagnosis cards 3-5 completely inaccessible. This PRD outlines the requirements to implement proper scrollable behavior within the modal's constrained height.

**Problem**: Users cannot access all differential diagnosis cards (currently only 2 of 5 visible) because the container has `overflow-hidden` and no scrolling mechanism.

**Goal**: Enable smooth vertical scrolling within the differential diagnoses tab to make all diagnosis cards accessible while maintaining the modal's responsive design.

## Goals

1. **Accessibility**: All differential diagnosis cards (up to 5) must be accessible through vertical scrolling
2. **User Experience**: Implement native browser scrolling with clean, invisible scrollbar behavior
3. **Visual Consistency**: Maintain current card design and spacing while adding scroll capability
4. **Fixed Header**: Keep the "Differential Diagnoses" title and count visible while content scrolls
5. **Cross-Browser Compatibility**: Ensure functionality works across all major desktop browsers

## User Stories

1. **As a clinician**, I want to scroll through all differential diagnoses so that I can review the complete list of potential conditions ranked by likelihood.

2. **As a clinician**, I want the diagnosis count and header to remain visible while scrolling so that I maintain context of the total number of diagnoses.

3. **As a clinician**, I want smooth, native browser scrolling so that the interaction feels natural and responsive.

4. **As a system user**, I want the scrolling to work consistently across different browsers so that my workflow isn't interrupted by technical limitations.

## Functional Requirements

1. **Scroll Container Implementation**: The differential diagnoses content area must support vertical scrolling using `overflow-y-auto` or equivalent.

2. **Height Constraint**: The scrollable container must respect the modal's `max-h-[90vh]` constraint while allowing internal scrolling.

3. **Fixed Header**: The header section containing "Differential Diagnoses" title and count must remain fixed at the top during scrolling.

4. **Content Accessibility**: All 5 differential diagnosis cards must be reachable through scrolling on a 13-inch MacBook Air display.

5. **Scrollbar Styling**: Implement invisible or minimal scrollbar styling that appears only on hover/interaction.

6. **Responsive Behavior**: The scroll container must adapt to different content heights (1-5 diagnosis cards).

7. **Demo Mode Compatibility**: Scrolling must function in demo mode where content editing is disabled.

8. **Container Hierarchy Fix**: Resolve the current `overflow-hidden` blocking by restructuring parent containers to allow proper height calculation.

## Non-Goals (Out of Scope)

1. **Mobile Responsiveness**: Mobile/tablet scrolling optimization (desktop-only for this iteration)
2. **Custom Scrollbar Design**: Advanced scrollbar customization beyond basic invisible/minimal styling
3. **Horizontal Scrolling**: Any horizontal scrolling functionality
4. **Infinite Scrolling**: Dynamic loading of additional diagnoses beyond the fixed maximum of 5
5. **Transcript Tab Scrolling**: Fixing scrolling issues in other tabs (separate concern)
6. **Performance Optimization**: Advanced virtualization for large lists (not needed for max 5 items)

## Design Considerations

**Current Layout Structure**:
```
Modal Container (max-h-[90vh])
├── Header (fixed)
├── Tab Navigation (fixed)  
└── Content Area (flex-1, overflow-hidden) <- PROBLEM AREA
    └── DifferentialDiagnosesList
        ├── Header (fixed) <- Keep fixed
        └── Scrollable Content <- Needs scrolling
```

**Required Layout Structure**:
```
Modal Container (max-h-[90vh])
├── Header (fixed)
├── Tab Navigation (fixed)
└── Content Area (flex-1, overflow-hidden)
    └── DifferentialDiagnosesList (h-full, flex flex-col)
        ├── Header (flex-shrink-0) <- Fixed
        └── Scrollable Content (flex-1, overflow-y-auto, min-h-0) <- Scrolls
```

**Key CSS Requirements**:
- Parent containers: `overflow-hidden` to establish height constraints
- Scroll container: `flex-1 overflow-y-auto min-h-0` for proper flexbox scrolling
- Header: `flex-shrink-0` to prevent compression

## Technical Considerations

1. **Flexbox Height Constraints**: Ensure parent containers use `overflow-hidden` to establish proper height boundaries for child flex containers.

2. **CSS Framework**: Utilize existing Tailwind CSS classes where possible (`flex-1`, `overflow-y-auto`, `min-h-0`).

3. **Browser Compatibility**: Focus on Chromium-based browsers primarily, with fallback support for Firefox and Safari.

4. **Component Architecture**: Modify `DifferentialDiagnosesList.tsx` and `ConsultationPanel.tsx` container structure.

5. **Demo Mode Integration**: Ensure scrolling works independently of content editing restrictions.

## Success Metrics

1. **Functional Success**: All 5 differential diagnosis cards are accessible through scrolling on a 13-inch display
2. **Visual Success**: Scrollbar appears only when needed and follows browser-native behavior
3. **Performance Success**: Smooth scrolling with no lag or visual glitches
4. **Compatibility Success**: Consistent behavior across Chrome, Firefox, and Safari on desktop
5. **User Testing Success**: Manual testing confirms no content is inaccessible due to scrolling issues

## Testing Requirements

### Manual Testing Checklist
1. **Basic Functionality**: Verify all 5 diagnosis cards are accessible via scrolling
2. **Header Behavior**: Confirm title and count remain visible during scroll
3. **Multiple Scenarios**: Test with 1, 3, and 5 diagnosis cards
4. **Cross-Browser**: Test on Chrome, Firefox, and Safari
5. **Screen Sizes**: Verify on 13-inch display (primary) and common desktop resolutions
6. **Demo Mode**: Confirm scrolling works in demo consultation mode

### Automated Testing Considerations
- Add visual regression tests for scroll container layout
- Include scroll behavior tests in existing Playwright E2E suite
- Unit tests for component height calculations

## Open Questions

1. **Performance**: Should we implement scroll virtualization if the diagnosis count increases beyond 5 in the future?
2. **Accessibility**: Do we need keyboard navigation support for scrolling (arrow keys, page up/down)?
3. **Touch Support**: Should we prepare for future touch/trackpad gesture support?
4. **Error Handling**: How should the component behave if diagnosis data fails to load during scroll?

## Implementation Priority

**High Priority**:
- Fix container overflow hierarchy
- Implement basic vertical scrolling
- Ensure all 5 cards are accessible

**Medium Priority**:
- Cross-browser testing and compatibility
- Scrollbar styling optimization

**Low Priority**:
- Performance optimizations
- Advanced accessibility features 