# Consultation Panel Component

## Overview

The `ConsultationPanel` is a full-screen modal component that provides a modern, glassmorphic interface for creating new consultations with immediate encounter creation and clinical plan generation.

## Features

### Phase 4 Implementation (Current)

- **Full-Screen Overlay**: Uses a semi-transparent backdrop (`bg-black/70`) with backdrop blur
- **Glassmorphic Design**: Content container uses backdrop blur for consistent styling
- **React Portal**: Renders via `createPortal` to `document.body` for proper z-index layering
- **Immediate Encounter Creation**: Automatically creates a new encounter when the panel opens
- **Patient Context**: Displays patient name and encounter ID in the header
- **Keyboard Support**: ESC key closes the panel
- **Error Handling**: Proper error states and loading indicators

#### Clinical Plan Features

- **Transcript Interface**: Large textarea for consultation notes with auto-focus
- **Clinical Plan Button**: Enabled when transcript has 10+ characters
- **Loading States**: Shows "Analyzing..." with spinner during AI processing
- **Tab Navigation**: Smooth transition to tabbed interface after plan generation
- **Diagnosis Tab**: Editable textarea pre-filled with AI-generated diagnosis
- **Treatment Tab**: Editable textarea pre-filled with AI-generated treatment plan
- **Error Handling**: Graceful fallback to manual completion if AI fails
- **Smooth Animations**: Tab bar fades in with CSS transitions

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

- Uses backdrop blur for glassmorphic effect
- Container: `w-[90%] max-w-4xl` with `max-h-[90vh]` (expanded for tabs)
- Backdrop: `fixed inset-0 z-50 bg-black/70 backdrop-blur-md`
- Positioned with flexbox centering
- Responsive design with proper overflow handling

### Clinical Plan Workflow

1. **Start Consultation**: User clicks "Start Consultation" button
2. **Transcript Entry**: Large textarea appears for consultation notes
3. **Clinical Plan Trigger**: Button enabled when transcript ≥ 10 characters
4. **AI Processing**: Calls `/api/clinical-engine` with patient ID, encounter ID, and transcript
5. **Loading State**: Button shows "Analyzing..." with spinner
6. **Tab Transition**: Smooth animation to tabbed interface
7. **Content Population**: Diagnosis and treatment tabs filled with AI results
8. **Manual Editing**: All content remains editable for physician review

### Tab Navigation

The panel supports three tabs:
- **Transcript**: Original consultation notes (always accessible)
- **Diagnosis**: AI-generated diagnosis (editable)
- **Treatment**: AI-generated treatment plan (editable)

Tabs use smooth CSS transitions and maintain state when switching.

### API Integration

Integrates with the clinical engine via `/api/clinical-engine`:

```typescript
// Request payload
{
  patientId: string,
  encounterId: string,
  transcript: string
}

// Expected response structure
{
  diagnosticResult: {
    diagnosisName?: string,
    primaryDiagnosis?: string,
    recommendedTreatments?: string[],
    treatmentPlan?: string
  }
}
```

### Error Handling

- **API Failures**: Shows toast notification but still transitions to tabbed interface
- **Network Issues**: Graceful fallback allows manual completion
- **Save Failures**: Prevents panel closure and shows retry option
- **Validation**: Clinical Plan button disabled until sufficient transcript content

### Encounter Creation

The panel automatically creates a new encounter when opened:

1. Calls `supabaseDataService.createNewEncounter()` immediately on open
2. Sets reason to empty string (to be filled from transcript later)
3. Uses current timestamp for `scheduledStart`
4. Handles creation errors with toast notifications

### State Management

Key state variables:
- `started`: Controls initial vs. active consultation view
- `transcriptText`: Consultation notes content
- `diagnosisText`: AI-generated/edited diagnosis
- `treatmentText`: AI-generated/edited treatment plan
- `activeTab`: Current tab selection
- `planGenerated`: Controls tab visibility
- `tabBarVisible`: Controls tab animation
- `isGeneratingPlan`: Loading state for AI processing

### Future Enhancements

Planned improvements:
- **Voice Recognition**: Real-time speech-to-text integration
- **Auto-save**: Periodic saving of transcript content
- **Collaboration**: Real-time multi-user editing
- **Templates**: Pre-filled consultation templates
- **Integration**: Direct EHR system integration

## Browser Compatibility

- Uses React 18+ `createPortal` for rendering
- Requires modern browser support for backdrop-filter CSS
- Graceful fallback via existing CSS media queries for reduced transparency
- Responsive design works on mobile and desktop

## Testing

Key test scenarios:
1. Panel opens and creates encounter successfully
2. Transcript entry enables Clinical Plan button at 10 characters
3. Clinical Plan API call succeeds and populates tabs
4. Clinical Plan API failure shows error but allows manual completion
5. Tab switching preserves content
6. Save functionality works with all content types
7. ESC key closes panel with save prompt if needed

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