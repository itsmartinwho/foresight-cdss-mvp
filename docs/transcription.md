# Transcription System Guide

This document provides a comprehensive guide to the Foresight CDSS transcription system, covering its architecture, development best practices, and troubleshooting.

## 🚨 Critical Warning for Developers

**DO NOT include the `stopTranscription` callback (or any cleanup callback) in useEffect dependency arrays.** This will cause an immediate start/stop cycle that breaks transcription functionality.

### Quick Reference: What NOT to Do

```typescript
// ❌ NEVER DO THIS - Will break transcription
useEffect(() => {
  return () => {
    stopTranscription(true);
  };
}, [isOpen, stopTranscription]); // stopTranscription in deps = broken
```

### Quick Reference: What TO Do

```typescript
// ✅ CORRECT - Direct cleanup without callback dependencies
useEffect(() => {
  if (isOpen) return;
  
  if (transcriptionActiveRef.current) {
    // Direct cleanup using refs
    if(mediaRecorderRef.current) {
      // ... cleanup mediaRecorder
    }
    // ... cleanup other resources
  }
}, [isOpen]); // Only modal state in deps
```

## Overview

The transcription system is a core feature of the Foresight CDSS that provides real-time speech-to-text functionality during patient consultations. It automatically starts when a new consultation is created and provides pause/resume controls for the physician.

### Intended Behavior

- **Auto-Start**: Transcription begins automatically when a new consultation modal is opened.
- **User Controls**: Pause, resume, and stop functionality is available.
- **Session Management**: Sessions are automatically managed and resources are cleaned up on modal close.

## System Architecture

### Key Components

- **`ConsultationPanel.tsx`**: The main container for the consultation UI, responsible for managing the transcription lifecycle.
- **`AudioWaveform.tsx`**: The visual component for audio input with control buttons.
- **Deepgram WebSocket**: The service used for real-time speech-to-text processing.

### State Management and the Ref-State Pattern

The system uses a combination of React state (`useState`) and refs (`useRef`) to manage asynchronous operations and avoid race conditions.

**The core problem solved by this pattern was a race condition where React's dependency management would trigger cleanup functions immediately after starting transcription.**

To prevent this, we use a "ref-state" pattern:
1. State (`isTranscribing`) is used for UI reactivity.
2. A ref (`transcriptionActiveRef`) is used for reliable access to the current state in asynchronous callbacks and cleanup functions.

```typescript
const setIsTranscribingAndRef = (val: boolean) => {
  setIsTranscribing(val);           // For UI reactivity
  transcriptionActiveRef.current = val;  // For cleanup/async access
};
```

## Essential Developer Patterns

### 1. The Cleanup Order Pattern

Always clean up resources in this exact order to prevent memory leaks and errors:

1.  **MediaRecorder**: Stop the recorder and its tracks.
2.  **Audio Stream**: Stop all tracks on the audio stream.
3.  **WebSocket**: Close the connection.
4.  **State**: Update `isTranscribing` and `isPaused` state to `false`.

### 2. The Stable Callback Pattern

When passing callbacks to child components, ensure they are stable by using `useCallback` with an empty dependency array and accessing any required state via refs. This prevents unnecessary re-renders.

### 3. The Auto-Start Protection Pattern

To prevent infinite loops of transcription auto-starting, use a ref to track whether an auto-start has already been attempted for a given encounter.

## Debugging and Testing

### Debugging Checklist

1.  **Check Console Logs**: Look for the critical log message: `"[ConsultationPanel] Cleanup: Stopping transcription on true close/unmount"`. If it appears immediately after starting, you have a dependency issue.
2.  **Verify Refs and State**: Ensure `transcriptionActiveRef.current` and the `isTranscribing` state are in sync.
3.  **Check MediaRecorder State**: Log `mediaRecorderRef.current?.state` to see if it's `'recording'`, `'paused'`, or `'inactive'`.

### Must-Test Scenarios

- **Basic Flow**: Start, speak, see text.
- **Pause/Resume**: Pause and resume transcription, ensuring it continues correctly.
- **Modal Close**: Close the modal and verify that all resources are cleaned up properly (e.g., the browser microphone icon disappears).

## API and Dependencies

- **Deepgram API**: The system uses the Deepgram API for speech-to-text.
    - **Endpoint:** `wss://api.deepgram.com/v1/listen`
    - **Model:** `nova-3-medical`
- **Environment Variables**:
    - `NEXT_PUBLIC_DEEPGRAM_API_KEY`: Required for the transcription service. 