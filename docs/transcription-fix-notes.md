# Transcription Service Fix Notes

## Issue Summary
The transcription service was starting and immediately stopping when opening the "New Consultation" modal. The browser microphone icon would appear briefly then disappear, and no text was being transcribed.

## Root Cause
The issue was caused by React's dependency management in useEffect hooks. The `stopTranscription` callback was included in several dependency arrays, and when this callback was recreated due to its own dependencies changing, it triggered effect cleanup functions that would stop the transcription immediately after it started.

## Solution
1. **Removed `stopTranscription` from dependency arrays**: This prevents the effect from re-running when the callback is recreated
2. **Created a dedicated cleanup effect**: Only runs when the modal truly closes (`isOpen` becomes false)
3. **Removed duplicate cleanup calls**: Eliminated redundant stopTranscription calls from other effects
4. **Created stable callbacks**: Made a stable `handleAudioWaveformStop` callback with no dependencies for the AudioWaveform component
5. **Properly maintained refs**: Ensured `transcriptionActiveRef` is updated correctly to track transcription state

## Testing Instructions

1. Navigate to the application at http://localhost:3000
2. Go to the patients list
3. Select any patient
4. Click the "New Consultation" button
5. The transcription should start automatically:
   - Browser tab should show microphone icon
   - Waveform pillbox should appear at the bottom of the transcript area
   - Speak and verify text appears in the transcript
6. Test pause/resume:
   - Click the pause button on the pillbox
   - Verify the icon changes to play
   - Verify the pillbox remains visible
   - Click play to resume
   - Verify transcription continues
7. Test closing:
   - Close the modal with the X button or Save & Close
   - Verify no errors in console
   - Reopen and verify transcription starts again

## Key Code Changes
- Modified `src/components/modals/ConsultationPanel.tsx`
- Cleanup effect now only depends on `isOpen` prop
- Direct cleanup operations in callbacks instead of using the `stopTranscription` function
- Stable callback refs for child components 