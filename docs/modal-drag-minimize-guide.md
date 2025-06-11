# Draggable and Minimizable Modals Guide

This guide covers the implementation and usage of the draggable and minimizable modal system in the Foresight CDSS application.

> **Status: COMPLETED** ✅
> 
> The draggable and minimizable modal functionality has been fully implemented with centralized overlay management to prevent UI blocking issues. 
> 
> **Test it:** Visit `/demo/modal-test` to see all functionality in action.
> 
> **Key fixes applied:**
> - Centralized overlay rendering in ModalManagerProvider
> - Overlay only shows when modals are visible and not minimized  
> - Proper z-index management and scroll locking
> - No more persistent overlays blocking the UI

## Overview

The modal system enhances user productivity by allowing modals to be:
- **Dragged** around the screen for optimal positioning
- **Minimized** to a bottom taskbar when not actively needed
- **Restored** from the minimized state with a single click
- **Persisted** across browser sessions with position memory

## Features

### Core Functionality
- **Drag and Drop**: Click and drag modals by their title bars
- **Minimize/Restore**: Collapse modals to a bottom taskbar
- **Position Persistence**: Remember modal positions across sessions
- **Viewport Constraints**: Modals stay within screen boundaries
- **Keyboard Shortcuts**: Ctrl+M to minimize, Esc to close
- **Accessibility**: Full screen reader and keyboard navigation support

### Visual Design
- Glass morphism styling with backdrop blur
- Smooth animations for state transitions
- Visual feedback during drag operations
- Responsive design for different screen sizes

## Usage

### Basic Modal Components

All existing modal components now support draggable functionality:

#### Dialog Component

```tsx
import { Dialog, DraggableDialogContent } from '@/components/ui/dialog';

function MyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DraggableDialogContent
        draggable={true}
        draggableConfig={{
          defaultPosition: { x: 100, y: 100 },
          canMinimize: true,
          modalId: 'my-modal',
        }}
      >
        <DialogHeader>
          <DialogTitle>My Draggable Modal</DialogTitle>
        </DialogHeader>
        {/* Modal content */}
      </DraggableDialogContent>
    </Dialog>
  );
}
```

#### AlertDialog Component

```tsx
import { AlertDialog, DraggableAlertDialogContent } from '@/components/ui/alert-dialog';

function MyAlert({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <DraggableAlertDialogContent
        draggable={true}
        draggableConfig={{
          defaultPosition: { x: 200, y: 150 },
          canMinimize: false, // Alerts typically shouldn't be minimized
          modalId: 'my-alert',
        }}
      >
        {/* Alert content */}
      </DraggableAlertDialogContent>
    </AlertDialog>
  );
}
```

#### Sheet Component

```tsx
import { Sheet, DraggableSheetContent } from '@/components/ui/sheet';

function MySheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <DraggableSheetContent
        side="right"
        draggable={true}
        draggableConfig={{
          defaultPosition: { x: 'auto', y: 100 }, // Auto-position based on side
          canMinimize: true,
          modalId: 'my-sheet',
        }}
      >
        {/* Sheet content */}
      </DraggableSheetContent>
    </Sheet>
  );
}
```

### Custom Modal Components

For custom modal implementations, use the `DraggableModalWrapper`:

```tsx
import { DraggableModalWrapper } from '@/components/ui/draggable-modal-wrapper';

function CustomModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <DraggableModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Custom Modal"
      config={{
        defaultPosition: { x: 150, y: 100 },
        canMinimize: true,
        canMaximize: false,
        persistPosition: true,
        modalId: 'custom-modal',
      }}
    >
      <div className="p-6">
        {/* Your custom modal content */}
      </div>
    </DraggableModalWrapper>
  );
}
```

## Configuration Options

### ModalDragAndMinimizeConfig

```tsx
interface ModalDragAndMinimizeConfig {
  /** Default position when modal opens */
  defaultPosition: { x: number | 'auto'; y: number | 'auto' };
  
  /** Whether the modal can be minimized */
  canMinimize?: boolean;
  
  /** Whether the modal can be maximized (future feature) */
  canMaximize?: boolean;
  
  /** Whether to persist position in sessionStorage */
  persistPosition?: boolean;
  
  /** Unique identifier for position persistence */
  modalId: string;
  
  /** Minimum size constraints */
  minSize?: { width: number; height: number };
  
  /** Maximum size constraints */
  maxSize?: { width: number; height: number };
}
```

### Position Values

- **Numbers**: Exact pixel coordinates (e.g., `{ x: 100, y: 150 }`)
- **'auto'**: Automatic positioning based on modal type and screen size
- **Sheet positioning**: For sheets, 'auto' respects the `side` prop

### Default Configurations

Different modal types have sensible defaults:

```tsx
// Dialog - Center screen
const dialogDefaults = {
  defaultPosition: { x: 'auto', y: 'auto' },
  canMinimize: true,
  persistPosition: true,
};

// Alert Dialog - Center screen, no minimize
const alertDefaults = {
  defaultPosition: { x: 'auto', y: 'auto' },
  canMinimize: false,
  persistPosition: false,
};

// Sheet - Side-based positioning
const sheetDefaults = {
  defaultPosition: { x: 'auto', y: 100 },
  canMinimize: true,
  persistPosition: true,
};
```

## Modal Manager

The `ModalManager` component handles the minimized modal bar and global state:

```tsx
// Add to your root layout or App component
import { ModalManager } from '@/components/ui/modal-manager';

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <ModalManager />
    </div>
  );
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + M` | Minimize/Restore active modal |
| `Escape` | Close active modal |
| `Tab` | Navigate between modal elements |
| `Enter` | Activate focused button |
| `Space` | Toggle focused checkbox/button |

## Accessibility Features

### Screen Reader Support

- Proper ARIA labels and roles
- Live region announcements for state changes
- Keyboard navigation between elements

### Keyboard Navigation

- All interactive elements are focusable
- Logical tab order maintained
- Focus management during minimize/restore

### High Contrast Support

- Sufficient color contrast ratios
- Visual indicators don't rely solely on color
- Focus indicators clearly visible

### Example ARIA Implementation

```tsx
<div
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  aria-modal="true"
>
  <div
    role="banner"
    aria-label="Drag to move modal"
    onMouseDown={handleDragStart}
  >
    <h2 id="modal-title">Modal Title</h2>
    <button
      aria-label="Minimize modal"
      onClick={handleMinimize}
    >
      −
    </button>
  </div>
  <div id="modal-description">
    Modal content description
  </div>
</div>
```

## Browser Compatibility

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement

- Core modal functionality works without drag features
- Graceful degradation on older browsers
- No JavaScript required for basic modal display

## Performance Considerations

### Optimizations

- Event listeners added/removed efficiently
- Position updates throttled during drag
- Minimal DOM manipulations
- CSS transforms for smooth animations

### Memory Management

- Automatic cleanup on component unmount
- SessionStorage data expiration (24 hours)
- Event listener removal

### Best Practices

1. **Unique Modal IDs**: Always provide unique `modalId` for persistence
2. **Reasonable Defaults**: Use sensible default positions
3. **Minimize State**: Only enable minimize for appropriate modals
4. **Testing**: Test drag behavior across different screen sizes

## Troubleshooting

### Common Issues

#### Modal Not Draggable

```tsx
// ❌ Wrong - missing draggable prop
<DraggableDialogContent>
  {/* content */}
</DraggableDialogContent>

// ✅ Correct - enable draggable
<DraggableDialogContent draggable={true}>
  {/* content */}
</DraggableDialogContent>
```

#### Position Not Persisting

```tsx
// ❌ Wrong - missing modalId
<DraggableModalWrapper
  config={{
    persistPosition: true,
    // modalId missing!
  }}
>

// ✅ Correct - include unique modalId
<DraggableModalWrapper
  config={{
    persistPosition: true,
    modalId: 'unique-modal-id',
  }}
>
```

#### Multiple Modals Conflicting

```tsx
// ❌ Wrong - same modalId for different modals
<Modal config={{ modalId: 'modal' }} />
<Modal config={{ modalId: 'modal' }} />

// ✅ Correct - unique modalIds
<Modal config={{ modalId: 'patient-modal' }} />
<Modal config={{ modalId: 'guideline-modal' }} />
```

### Debugging

Enable debug logging by setting localStorage:

```javascript
localStorage.setItem('debug-modal-drag', 'true');
```

This will log drag events, position updates, and persistence operations to the console.

## Examples

### Patient Consultation Modal

```tsx
function PatientConsultationModal({ patient, isOpen, onClose }) {
  return (
    <DraggableModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={`Consultation - ${patient.name}`}
      config={{
        defaultPosition: { x: 100, y: 100 },
        canMinimize: true,
        persistPosition: true,
        modalId: `consultation-${patient.id}`,
      }}
    >
      <div className="consultation-content">
        {/* Consultation interface */}
      </div>
    </DraggableModalWrapper>
  );
}
```

### Clinical Guideline Modal

```tsx
function GuidelineModal({ guideline, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DraggableDialogContent
        draggable={true}
        draggableConfig={{
          defaultPosition: { x: 200, y: 150 },
          canMinimize: true,
          persistPosition: true,
          modalId: `guideline-${guideline.id}`,
        }}
      >
        <DialogHeader>
          <DialogTitle>{guideline.title}</DialogTitle>
        </DialogHeader>
        <div className="guideline-content">
          {/* Guideline content */}
        </div>
      </DraggableDialogContent>
    </Dialog>
  );
}
```

### Multi-Modal Workflow

```tsx
function ClinicalWorkspace() {
  const [openModals, setOpenModals] = useState({
    consultation: false,
    guidelines: false,
    notes: false,
  });

  return (
    <div>
      {/* Modal triggers */}
      <button onClick={() => setOpenModals(prev => ({ ...prev, consultation: true }))}>
        Open Consultation
      </button>
      
      {/* Multiple draggable modals */}
      <ConsultationModal
        isOpen={openModals.consultation}
        onClose={() => setOpenModals(prev => ({ ...prev, consultation: false }))}
      />
      
      <GuidelinesModal
        isOpen={openModals.guidelines}
        onClose={() => setOpenModals(prev => ({ ...prev, guidelines: false }))}
      />
      
      <NotesModal
        isOpen={openModals.notes}
        onClose={() => setOpenModals(prev => ({ ...prev, notes: false }))}
      />
      
      {/* Required for minimized modal management */}
      <ModalManager />
    </div>
  );
}
```

## Future Enhancements

### Planned Features

- **Modal Maximization**: Expand modals to full screen
- **Snap to Grid**: Align modals to invisible grid
- **Modal Stacking**: Z-index management for overlapping modals
- **Gesture Support**: Touch gestures for mobile devices
- **Window Docking**: Snap modals to screen edges

### Extensibility

The system is designed to be extensible. Custom behaviors can be added by:

1. Extending the configuration interface
2. Adding new hooks for specialized behavior
3. Creating custom modal wrapper components
4. Implementing additional persistence strategies

## Support

For issues, questions, or feature requests related to the draggable modal system:

1. Check this documentation first
2. Review the troubleshooting section
3. Enable debug logging to investigate issues
4. Test with different browsers and screen sizes
5. Consult the implementation team for complex scenarios

---

*This documentation covers the complete draggable and minimizable modal system. For implementation details, see the source code in `/src/components/ui/` and `/src/hooks/`.* 