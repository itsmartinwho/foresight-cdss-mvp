# Consultation Panel Component

## Overview

The `ConsultationPanel` is a new full-screen modal component that replaces the old consultation modal in patient workspaces. It provides a modern, glassmorphic interface for creating new consultations with immediate encounter creation.

## Features

### Phase 1 Implementation

- **Full-Screen Overlay**: Uses a semi-transparent backdrop (`bg-black/50`) with backdrop blur
- **Glassmorphic Design**: Content container uses the existing `glass` CSS class for consistent styling
- **React Portal**: Renders via `createPortal` to `document.body` for proper z-index layering
- **Immediate Encounter Creation**: Automatically creates a new encounter when the panel opens
- **Patient Context**: Displays patient name and current date in the header
- **Keyboard Support**: ESC key closes the panel
- **Error Handling**: Proper error states and loading indicators

### Component Props

```typescript
interface ConsultationPanelProps {
  /** Controls open state from parent */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Patient to create consultation for */
  patient: Patient;
  /** Callback when consultation is successfully created */
  onConsultationCreated?: (encounter: Encounter) => void;
}
```

### Usage

```tsx
import ConsultationPanel from '@/components/modals/ConsultationPanel';

function PatientWorkspace() {
  const [showPanel, setShowPanel] = useState(false);
  
  const handleConsultationCreated = (encounter: Encounter) => {
    // Handle the newly created encounter
    console.log('New encounter created:', encounter.id);
  };

  return (
    <>
      <Button onClick={() => setShowPanel(true)}>
        New Consultation
      </Button>
      
      <ConsultationPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        patient={patient}
        onConsultationCreated={handleConsultationCreated}
      />
    </>
  );
}
```

## Implementation Details

### Styling

- Uses existing `glass` CSS class for glassmorphic effect
- Container: `w-[90%] max-w-2xl` with `max-h-[90vh]`
- Backdrop: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`
- Positioned with flexbox centering

### Encounter Creation

The panel automatically creates a new encounter when opened:

1. Calls `supabaseDataService.createNewEncounter()` immediately on open
2. Sets reason to empty string (to be filled from transcript later)
3. Uses current timestamp for `scheduledStart`
4. Handles creation errors with toast notifications

### Future Phases

The panel is designed to be extended in future phases:

- **Phase 2**: Add transcript/editor interface
- **Phase 3**: Add tabbed interface for different consultation aspects
- **Phase 4**: Add real-time collaboration features
- **Phase 5**: Add auto-save functionality before closing

## Migration from Old Modal

The new panel replaces the previous `NewConsultationModal` in patient workspace contexts:

### Before
```tsx
// Old modal approach
const [isStartingNewConsultation, setIsStartingNewConsultation] = useState(false);

<Button onClick={() => setIsStartingNewConsultation(true)}>
  New Consultation
</Button>
```

### After
```tsx
// New panel approach
const [showConsultationPanel, setShowConsultationPanel] = useState(false);

<Button onClick={() => setShowConsultationPanel(true)}>
  New Consultation
</Button>

<ConsultationPanel
  isOpen={showConsultationPanel}
  onClose={() => setShowConsultationPanel(false)}
  patient={patient}
  onConsultationCreated={handleConsultationCreated}
/>
```

## Browser Compatibility

- Uses React 18+ `createPortal` for rendering
- Requires modern browser support for backdrop-filter CSS
- Graceful fallback via existing CSS media queries for reduced transparency 