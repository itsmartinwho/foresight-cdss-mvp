# Frontend Guide

This document establishes frontend development guidelines, styling conventions, and architectural patterns for the Foresight CDSS MVP.

**For the overall system architecture, AI tool implementation, and backend details, refer to [`architecture.md`](./architecture.md).**

## Code Organization

The project follows a standard Next.js project structure. For details on the directory structure and component architecture, refer to the "Frontend Architecture" section in [`architecture.md`](./architecture.md).

## Coding Standards

### TypeScript
- **Use TypeScript**: All components and functions typed.
- **Avoid `any`**: Use specific types or `unknown`.
- **Use interfaces/types**: For complex object types.
- **Type props**: Always type component props.
- **Export types**: Make types available for reuse.

### React & Components
- **Functional components**: Use functional components with hooks.
- **Custom hooks**: Extract reusable logic into custom hooks (`src/hooks/`).
- **Component size**: Keep components focused on a single responsibility.
- **Props destructuring**: Destructure props in function parameters.

## Key Components

### `ConsultationPanel`
The `ConsultationPanel` (`src/components/modals/ConsultationPanel.tsx`) is a key UI component for creating new consultations. It's a full-screen modal that automatically creates a new encounter when opened and provides a rich text editor for the consultation notes.

### `RichTextEditor`
The `RichTextEditor` (`src/components/ui/rich-text-editor.tsx`) is a robust text editing component built with Tiptap. It provides a reliable editing experience with an integrated toolbar and is compatible with the transcription service.

## State Management

- **Local State**: `useState` and `useReducer` for component-level state.
- **Global State**: React Context for shared state.
- **Data Fetching**: `supabaseDataService.ts` or direct Supabase client calls.

## Styling & UI Conventions

### Icon Library
The application uses Phosphor Icons (`@phosphor-icons/react`).

### Input and Placeholder Styling
Placeholders are styled to be paler and lighter than user-provided input. This is handled globally in `globals.css`.

### Patient Workspace Modernization (`PatientWorkspaceViewModern.tsx`)
The patient workspace has been modernized with a unified glassmorphic design and improved content organization using a reusable `Section` component.

### Side Panel Background Images
The dashboard and patients tab side panels now support custom background images with configurable transparency.

#### Configuration
All background image settings are centralized in `src/lib/side-panel-config.ts`:

```typescript
export const SIDE_PANEL_CONFIG = {
  // Background image path (relative to public directory)
  backgroundImage: '/images/background_waves.png',
  
  // Opacity for the background image (0.3 = 70% transparency)
  opacity: 0.3,
  
  // Background positioning and sizing
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};
```

To test a different image, add it to `public/images/` and update the `backgroundImage` path in the configuration file.

### Plasma Background Effect
A subtle, animated gradient flow background effect is implemented using Three.js and a custom GLSL fragment shader. It is managed outside the main React render tree for stability and respects the user's `prefers-reduced-motion` setting.

## Forms and Validation
- **Forms**: Standard React state and event handlers are used.
- **Validation**: Manual validation and simple checks are used.

## Performance Optimization
- **Memoization**: `React.memo`, `useCallback`, and `useMemo` are used to optimize performance.
- **Image optimization**: Next.js `<Image>` component should be used where possible.

## Accessibility
The application targets WCAG 2.1 AA compliance. This includes using semantic HTML, providing ARIA attributes, ensuring keyboard navigation, and maintaining sufficient color contrast.

## Testing

_Refer to [./development_guide.md#testing-standards](./development_guide.md#testing-standards) for the comprehensive testing strategy._

- **Component Testing**: Storybook for UI components. React Testing Library (aspirational for wider unit/integration testing).
- **E2E Testing**: Playwright for critical user flows.
- **Mock Strategy**: `/api/advisor` is live in E2E. `src/lib/clinicalEngineService.ts` is a mock service.

## Documentation

### Code Documentation
- **JSDoc/TSDoc**: Document complex functions and components.
- **Props documentation**: Via TypeScript types.
- **Example usage**: In Storybook.

### Component Showcasing
- **Storybook**: Create stories for reusable UI components.

## Internationalization (Aspirational)
- No internationalization tools currently listed in `architecture.md`.

## Error Handling

### UI Error States
- **Error boundaries**: Use React error boundaries.
- **Fallback UIs**: Graceful degradation (e.g., `ErrorDisplay.tsx`).
- **User feedback**: Clear error messages.

## Security Best Practices

### Frontend Security
- **XSS prevention**: React helps by default. Avoid `innerHTML`.
- **CSRF protection**: Ensure protection if using custom state-changing API routes with cookies.
- **Sensitive data**: Never store unencrypted sensitive data in localStorage.

## Browser Compatibility
- **Support Targets**: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions).

## Code Quality Tools
- **ESLint & Prettier**: Enforce project rules.
- **TypeScript strict mode**: Enabled.

## Patient Workspace Architecture

### Tab Consolidation (2025 Refactor)

The patient workspace has been streamlined from 8 tabs to 2 tabs for improved user experience:

**Previous Structure (8 tabs):**
- Consultation
- Diagnosis  
- Treatment
- Labs
- Prior Auth
- Trials
- History
- All Data

**New Structure (2 tabs):**
- **Consultation** - Consolidated view for selected encounter
- **All Data** - Complete patient data across all encounters

### ConsolidatedConsultationTab Component

The new `ConsolidatedConsultationTab` (`src/components/patient-workspace-tabs/ConsolidatedConsultationTab.tsx`) combines all clinical data for a specific encounter in a vertical layout:

#### Layout Structure
1. **Encounter Header** - Date, ID, and reason for visit
2. **Summary Notes (SOAP Notes)** - Clinical summary with transcript viewer button
3. **Diagnosis** - Diagnoses for the encounter
4. **Treatment** - Treatment plans and medications  
5. **Labs** - Laboratory results
6. **Prior Authorization** - Prior auth forms and documentation
7. **Clinical Trials** - Relevant trial recommendations

#### Key Features
- **Encounter-Specific:** Shows data only for the selected encounter from the dropdown
- **Transcript Viewing:** "View Transcript" button opens a modal viewer for the full transcript
- **Card-Based Layout:** Each section is in a separate Card component for visual organization
- **Responsive Design:** Mobile-friendly with proper spacing and collapsible sections

#### Integration Points
- **PatientWorkspaceViewModern:** Main workspace component that renders the consolidated tab
- **Encounter Selection:** Uses the same encounter dropdown that was previously available
- **Demo Compatibility:** Maintains full compatibility with demo mode and routing
- **Routing Preservation:** All existing navigation from dashboard, patients list, and deep links continue to work

### Design Rationale

The consolidation addresses several UX concerns:
- **Reduced Cognitive Load:** Fewer tabs to navigate
- **Contextual Grouping:** All data for one encounter in one view
- **Improved Workflow:** Clinical data flows logically from notes → diagnosis → treatment → labs → documentation
- **Mobile Optimization:** Better experience on smaller screens with fewer navigation elements

### Migration Notes

The consolidation maintains backward compatibility:
- **URL Routes:** Existing patient workspace URLs continue to work  
- **Demo System:** Full demo functionality preserved
- **Data Structures:** No changes to underlying data models
- **Component Reuse:** Original tab components preserved for potential future use

Components like `DiagnosisTab`, `TreatmentTab`, etc. remain in the codebase but are no longer imported into the main workspace view. 