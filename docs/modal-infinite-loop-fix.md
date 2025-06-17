# Modal Infinite Loop Fix Documentation

## Problem Summary
The NewConsultationModal was causing a "Maximum update depth exceeded" error when opened from the dashboard and patients tab. This was due to an infinite render loop caused by the interaction between Radix UI's focus management system and our draggable modal implementation.

## Root Causes Identified

### 1. Focus Event Propagation
- Radix UI's `@radix-ui/react-compose-refs` was triggering setState calls continuously
- The `onOpenAutoFocus` and `onCloseAutoFocus` handlers were being recreated on every render
- This caused the focus-scope to continuously update, triggering more renders

### 2. Unstable Object References in Drag Hook
- `containerProps` and `dragHandleProps` were being recreated with new object identity on every render
- This caused components using these props to re-render infinitely
- The drag offset state was being updated unnecessarily

### 3. Duplicate Event Handlers
- Mouse event handlers were being registered both in `handleDragStart` and in a separate `useEffect`
- This caused conflicting state updates and race conditions

### 4. Modal Registration Issues
- The modal could be registered multiple times if the hook re-ran
- Missing safeguards for preventing multiple registrations

## Solution Applied

### 1. Focus Event Isolation
```tsx
// Extract focus handlers to prevent re-renders
const { onOpenAutoFocus, onCloseAutoFocus, ...restProps } = props;

// Use refs to store callbacks
const onOpenAutoFocusRef = React.useRef(onOpenAutoFocus);
const onCloseAutoFocusRef = React.useRef(onCloseAutoFocus);
```

### 2. Stabilized Drag State Management
```tsx
// Update ref directly to avoid state updates
dragOffsetRef.current = offset;

// Guard against unnecessary state updates
setDragState(prev => {
  if (prev.currentPosition.x === constrainedPosition.x && 
      prev.currentPosition.y === constrainedPosition.y) {
    return prev;
  }
  return { ...prev, currentPosition: constrainedPosition };
});
```

### 3. Consolidated Event Handling
- Removed duplicate mouse event handlers in `useEffect`
- All event handling now managed through `handleDragStart`, `handleDragMove`, and `handleDragEnd`
- Used `setTimeout` for position updates to ensure state consistency

### 4. Registration Safeguards
```tsx
const isMountedRef = useRef(false);

useEffect(() => {
  if (isValidConfig && !isMountedRef.current) {
    isMountedRef.current = true;
    registerModal(config!, pathname);
  }
  // ... cleanup
}, [isValidConfig, config?.id, registerModal, unregisterModal, pathname]);
```

## Testing Instructions

1. Navigate to the dashboard
2. Click "New Consultation" button
3. Modal should open without errors
4. Close and reopen multiple times
5. Test from patients tab as well
6. Check console for any "Maximum update depth exceeded" errors

## Additional Safeguards

1. Added `onInteractOutside` handler to prevent closing during creation
2. Debug logging to track component renders
3. Proper cleanup of event listeners and refs

## Known Limitations

This fix addresses the infinite loop issue but does not solve the underlying architectural mismatch between Radix UI's focus management and custom draggable implementations. Future improvements could include:

1. Using a dedicated draggable library that's compatible with Radix UI
2. Implementing a custom focus management system
3. Upgrading to newer versions of Radix UI that may have fixes for these issues

## Related Issues

- Radix UI Issue #2717: Maximum update depth exceeded with HoverCard/Popover
- Known issue with `@radix-ui/react-popper` and `onAnchorChange` missing dependencies
- Focus management conflicts when combining Radix primitives with custom implementations 