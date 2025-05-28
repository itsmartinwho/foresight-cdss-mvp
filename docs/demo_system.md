# Demo System Architecture

## Overview

The Foresight CDSS MVP includes a comprehensive demo system that showcases the platform's capabilities using existing features with automatic navigation and animations. The demo system is built with a clean service layer architecture that separates demo logic from production functionality.

## Architecture

### Service Layer

The demo system is built around three core services that handle different aspects of the demo experience:

#### 1. DemoDataService (`src/services/demo/DemoDataService.ts`)

Contains all demo data including:
- **Dorothy Robinson Patient Data**: Complete patient profile with demographics, medical history, and conditions
- **Encounter Data**: Structured encounter information with timestamps and medical details
- **Transcript Lines**: Animated conversation transcript for the consultation demo
- **Clinical Content**: Diagnosis text and treatment plan content

**Key Methods:**
- `getPatientData()`: Returns the demo patient (Dorothy Robinson)
- `getEncounterData()`: Returns structured encounter information
- `getTranscriptLines()`: Returns array of transcript lines for animation
- `getDiagnosisText()` / `getTreatmentPlanText()`: Returns clinical content

#### 2. DemoAnimationService (`src/services/demo/DemoAnimationService.ts`)

Handles all demo animations and timing:
- **Transcript Animation**: Types out conversation lines with 1200ms intervals
- **Clinical Plan Simulation**: Simulates AI processing with 1800ms delay
- **Cleanup Management**: Proper cleanup of timers and intervals

**Key Methods:**
- `startTranscriptAnimation()`: Begins typing animation for transcript
- `startClinicalPlanSimulation()`: Simulates clinical plan generation
- `clearAllAnimations()`: Cleanup method for all active animations

#### 3. DemoStateService (`src/services/demo/DemoStateService.ts`)

Manages demo state persistence and cross-tab communication:
- **localStorage Integration**: Persists demo completion state
- **Cross-tab Synchronization**: Ensures consistent state across browser tabs
- **Stage Management**: Tracks demo progression through defined stages

**Key Methods:**
- `hasDemoRun()` / `setDemoRun()`: Manages demo completion state
- `shouldShowDemoModal()`: Determines if intro modal should display
- `addStorageListener()`: Enables cross-tab state synchronization

### Hook Layer

The hook layer provides specialized demo behavior for different component types:

#### 1. useDemoOrchestrator (`src/hooks/demo/useDemoOrchestrator.tsx`)

Main orchestrator that coordinates between all services:
- **State Management**: Centralizes all demo state
- **Service Coordination**: Manages interactions between services
- **Navigation Control**: Handles demo flow and routing
- **Animation Lifecycle**: Coordinates animation timing and cleanup

#### 2. useDemoConsultation (`src/hooks/demo/useDemoConsultation.tsx`)

Provides demo behavior specifically for consultation components:
- **Transcript Animation**: Manages animated conversation display
- **Clinical Plan Simulation**: Handles diagnosis and treatment plan generation
- **Demo Mode Props**: Provides demo-specific props for consultation panels

#### 3. useDemoWorkspace (`src/hooks/demo/useDemoWorkspace.tsx`)

Handles workspace demo behavior:
- **Panel Visibility**: Controls when demo consultation panel appears
- **Stage Management**: Manages workspace-specific demo stages
- **UI State**: Handles demo-specific UI states and transitions

### Context Layer

#### DemoContext (`src/contexts/DemoContext.tsx`)

Simplified context provider that wraps the demo orchestrator:
- **Provider Pattern**: Makes demo state available throughout the app
- **Type Safety**: Provides typed access to demo functionality
- **Error Handling**: Ensures hooks are used within proper context

## Demo Flow Stages

The demo progresses through the following stages:

1. **`introModal`**: Initial welcome modal with demo explanation
2. **`fabVisible`**: Floating action button becomes visible
3. **`selectingPatient`**: User selects Dorothy Robinson patient
4. **`navigatingToWorkspace`**: Navigation to patient workspace
5. **`consultationPanelReady`**: Consultation panel is ready to open
6. **`animatingTranscript`**: Transcript animation is playing
7. **`simulatingPlanGeneration`**: Clinical plan generation simulation
8. **`showingPlan`**: Final diagnosis and treatment plan display
9. **`finished`**: Demo completed

## Integration with Production Components

### Clean Separation Approach

The demo system integrates with production components through composition rather than modification:

```typescript
// Production component remains unchanged
const ProductionComponent = ({ patient, encounter }) => {
  // Normal production logic
};

// Demo behavior is added through hooks
const ComponentWithDemo = ({ patient, encounter }) => {
  const demoState = useDemo();
  const demoWorkspace = useDemoWorkspace({
    patient,
    isDemoActive: demoState.isDemoActive,
    // ... other demo props
  });

  // Component uses both production and demo logic
  return (
    <>
      <ProductionComponent patient={patient} encounter={encounter} />
      {demoWorkspace.shouldRunDemoUi && (
        <DemoSpecificComponent {...demoProps} />
      )}
    </>
  );
};
```

### Key Integration Points

1. **PatientWorkspaceViewModern**: Main workspace component with demo consultation panel
2. **ConsultationPanel**: Accepts demo props for animated behavior
3. **DashboardView**: Integrates demo modal and floating action button

## Benefits of This Architecture

### 1. Clean Separation of Concerns
- Demo logic is completely separated from production code
- No demo-specific props polluting production components
- Easy to maintain and test independently

### 2. Reusability
- Services can be used across different components
- Hooks provide specialized behavior for different use cases
- Easy to extend with new demo scenarios

### 3. Maintainability
- Clear boundaries between demo and production functionality
- Centralized demo data and logic
- Proper cleanup and memory management

### 4. Testing
- Services can be unit tested independently
- Demo behavior can be tested without affecting production
- Easy to mock demo services for testing

## Usage Examples

### Starting the Demo

```typescript
const { startDemo, isDemoActive, demoStage } = useDemo();

// Start demo programmatically
await startDemo();
```

### Adding Demo Behavior to Components

```typescript
const MyComponent = ({ patient }) => {
  const demoState = useDemo();
  const demoConsultation = useDemoConsultation({
    patient,
    isDemoActive: demoState.isDemoActive,
    demoStage: demoState.demoStage,
    // ... other props
  });

  return (
    <ConsultationPanel
      patient={patient}
      isDemoMode={demoConsultation.isDemoMode}
      initialDemoTranscript={demoConsultation.initialDemoTranscript}
      // ... other demo props
    />
  );
};
```

### Accessing Demo Data

```typescript
// Get demo patient data
const demoPatient = DemoDataService.getPatientData();

// Get demo encounter
const demoEncounter = DemoDataService.getEncounterData();

// Get transcript for animation
const transcriptLines = DemoDataService.getTranscriptLines();
```

## Future Enhancements

### Potential Improvements

1. **Multiple Demo Scenarios**: Support for different demo flows and patient cases
2. **Demo Recording**: Ability to record and replay user interactions
3. **Customizable Timing**: User-configurable animation speeds and delays
4. **Demo Analytics**: Track demo completion rates and user engagement
5. **Interactive Tutorials**: Step-by-step guided tours with tooltips

### Extension Points

The current architecture makes it easy to add:
- New demo services for different types of content
- Additional demo hooks for new component types
- Custom animation services for different interaction patterns
- New demo stages for extended workflows

## Troubleshooting

### Common Issues

1. **Demo Not Starting**: Check that Dorothy Robinson patient exists in database
2. **Animations Not Playing**: Verify DemoAnimationService cleanup is working properly
3. **State Persistence Issues**: Check localStorage permissions and cross-tab communication
4. **Memory Leaks**: Ensure proper cleanup of timers and event listeners

### Race Condition Prevention

The demo system has been designed to prevent common race conditions that can occur when demo and production logic interact:

#### 1. Encounter Creation Loops
- **Issue**: `useEffect` dependencies on `createEncounter` callback causing infinite loops
- **Solution**: Use refs to track creation state and separate dependency management
- **Implementation**: `shouldCreateEncounterRef` in `ConsultationPanel.tsx`

#### 2. Demo/Production Logic Conflicts
- **Issue**: Mixed demo and production state in same component instances
- **Solution**: Separate demo and production consultation panels entirely
- **Implementation**: Conditional rendering of separate `ConsultationPanel` instances

#### 3. Transcription Service Conflicts
- **Issue**: Multiple transcription sessions or conflicts with manual editing
- **Solution**: State guards and proper WebSocket cleanup
- **Implementation**: `isSavingRef` and connection cleanup in `ConsultationTab.tsx`

#### 4. Patient Data Loading Races
- **Issue**: Multiple simultaneous data loads triggering state updates
- **Solution**: Loading state refs and patient ID tracking
- **Implementation**: `isLoadingDataRef` and `loadedPatientIdRef` in `PatientWorkspaceViewModern.tsx`

### Best Practices for Robust Implementation

1. **Use Refs for State Guards**: Prevent multiple simultaneous operations
2. **Separate Demo from Production**: Never mix demo and production logic in the same component instance
3. **Proper Cleanup**: Always clean up WebSockets, timers, and event listeners
4. **Dependency Management**: Be careful with useEffect dependencies, especially callbacks
5. **Service Layer Separation**: Keep demo logic in services, not components

### Debugging

Enable demo debugging by checking console logs:
- Demo stage transitions are logged in `useDemoOrchestrator`
- Animation lifecycle events are logged in `DemoAnimationService`
- State changes are logged in `DemoStateService`
- Race condition prevention logs in component files 