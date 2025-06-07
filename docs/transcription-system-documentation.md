# Transcription System Documentation

## Overview

The transcription system is a core feature of the Foresight CDSS that provides real-time speech-to-text functionality during patient consultations. It automatically starts when a new consultation is created and provides pause/resume controls for the physician.

## Intended Behavior

### Auto-Start Sequence
1. User clicks "New Consultation" button
2. Modal opens and automatically creates a new encounter in the database
3. Transcription service starts immediately without user intervention
4. Browser requests microphone permission (if not already granted)
5. Waveform visualization appears at the bottom of the transcript area
6. Spoken words are transcribed in real-time and appear in the transcript editor

### User Controls
- **Pause Button**: Temporarily stops transcription while keeping the session active
- **Play Button**: Resumes transcription from where it left off
- **Stop Button**: Completely ends the transcription session
- **Pillbox Visibility**: The audio waveform "pillbox" remains visible throughout pause/resume cycles

### Session Management
- Transcription automatically stops when the modal is closed
- All audio resources are properly cleaned up on modal close
- Failed connections are handled gracefully with user feedback

## System Architecture

### Key Components

#### 1. ConsultationPanel (`src/components/modals/ConsultationPanel.tsx`)
- **Purpose**: Main container for the consultation interface
- **Responsibilities**:
  - Auto-starting transcription when encounter is created
  - Managing transcription state and lifecycle
  - Handling user interactions (pause/resume/stop)
  - Coordinating with AudioWaveform component
  - Cleaning up resources on modal close

#### 2. AudioWaveform (`src/components/ui/AudioWaveform.tsx`)
- **Purpose**: Visual representation of audio input with control buttons
- **Responsibilities**:
  - Displaying real-time waveform visualization
  - Providing pause/resume/stop buttons
  - Managing its own visibility based on transcription state

#### 3. Deepgram WebSocket Connection
- **Purpose**: Real-time speech-to-text processing
- **Responsibilities**:
  - Establishing secure WebSocket connection to Deepgram API
  - Streaming audio data from MediaRecorder
  - Receiving and processing transcription results
  - Handling connection errors and reconnection

### State Management Pattern

The transcription system uses a combination of React state and refs to manage complex asynchronous operations:

```typescript
// Core transcription state
const [isTranscribing, setIsTranscribing] = useState(false);
const [isPaused, setIsPaused] = useState(false);

// Critical refs for avoiding cleanup race conditions
const transcriptionActiveRef = useRef(false);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const socketRef = useRef<WebSocket | null>(null);
const audioStreamRef = useRef<MediaStream | null>(null);

// Auto-start management
const autoStartAttemptedRef = useRef<Set<string>>(new Set());
const autoStartSessionRef = useRef(false);
```

### Critical Design Pattern: Ref-Based Cleanup

**Why this pattern is essential:**

The transcription system was prone to a race condition where React's dependency management would trigger cleanup functions immediately after starting transcription. This happened because:

1. `stopTranscription` callback was included in useEffect dependency arrays
2. When `isTranscribing` state changed, it caused `stopTranscribing` to be recreated
3. Effect re-ran due to dependency change, triggering cleanup
4. Transcription was stopped immediately after starting

**Solution implemented:**

```typescript
// ❌ WRONG - This causes re-render loops
useEffect(() => {
  return () => {
    if (transcriptionActiveRef.current) {
      stopTranscription(true); // This callback is in dependencies!
    }
  };
}, [isOpen, stopTranscription]); // stopTranscription dependency causes issues

// ✅ CORRECT - Direct cleanup without callback dependencies
useEffect(() => {
  if (isOpen) return;
  
  if (transcriptionActiveRef.current) {
    // Direct cleanup operations using refs
    if(mediaRecorderRef.current) { /* cleanup */ }
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    // ... etc
  }
}, [isOpen]); // Only depend on isOpen
```

## Critical Patterns and Best Practices

### 1. Ref Management for Async Operations

**Always use refs for values needed in cleanup:**

```typescript
// Update both state and ref when transcription status changes
const setIsTranscribingAndRef = (val: boolean) => {
  setIsTranscribing(val);
  transcriptionActiveRef.current = val;
};
```

**Why:** Cleanup functions capture state values at effect creation time. For async operations that might complete after re-renders, refs provide current values.

### 2. Dependency Array Management

**Avoid including callback functions that depend on frequently changing state:**

```typescript
// ❌ WRONG - callback dependencies cause re-renders
const someCallback = useCallback(() => {
  if (isTranscribing) {
    stopTranscription();
  }
}, [isTranscribing, stopTranscription]);

// ✅ CORRECT - use refs in stable callbacks
const someCallback = useCallback(() => {
  if (transcriptionActiveRef.current) {
    // Direct cleanup using refs
    mediaRecorderRef.current?.stop();
  }
}, []); // No dependencies
```

### 3. Resource Cleanup Pattern

**Always clean up in the same order:**

```typescript
const cleanupTranscription = () => {
  // 1. Stop MediaRecorder
  if(mediaRecorderRef.current) {
    try {
      if(mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {} 
    mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
  }
  
  // 2. Stop audio tracks
  audioStreamRef.current?.getTracks().forEach(t => t.stop());
  audioStreamRef.current = null;
  
  // 3. Close WebSocket
  if(socketRef.current) {
    try {
      socketRef.current.close();
    } catch {} 
    socketRef.current = null;
  }
  
  // 4. Update state and refs
  setIsTranscribingAndRef(false);
  setIsPaused(false);
};
```

### 4. Auto-Start Management

**Prevent infinite auto-start loops:**

```typescript
const autoStartAttemptedRef = useRef<Set<string>>(new Set());

// Only attempt auto-start once per encounter
if (autoStartAttemptedRef.current.has(encounterId)) {
  return;
}
autoStartAttemptedRef.current.add(encounterId);
```

## Common Pitfalls and How to Avoid Them

### 1. The Cleanup Race Condition

**Problem:** Including cleanup functions in dependency arrays causes them to run on every state change.

**Solution:** Use dedicated cleanup effects that only depend on modal state:

```typescript
useEffect(() => {
  if (isOpen) return; // Only cleanup when closing
  // ... cleanup logic
}, [isOpen]); // Minimal dependencies
```

### 2. Memory Leaks from Uncleaned Resources

**Problem:** WebSocket connections, MediaRecorder, and MediaStream objects persist after component unmount.

**Solution:** Always clean up all three resource types:
- MediaRecorder and its stream tracks
- MediaStream and its tracks  
- WebSocket connections

### 3. State Updates After Unmount

**Problem:** Async operations (WebSocket messages, MediaRecorder events) try to update state after component unmounts.

**Solution:** Check component mount status or use refs for critical values:

```typescript
ws.onmessage = (e) => {
  if (!isOpen) return; // Early exit if component closed
  // ... process message
};
```

### 4. Inconsistent Pause/Resume State

**Problem:** MediaRecorder state and component state get out of sync.

**Solution:** Always check MediaRecorder state before operations:

```typescript
const pauseTranscription = useCallback(() => {
  if (mediaRecorderRef.current?.state === 'recording') {
    mediaRecorderRef.current.pause();
    setIsPaused(true);
  }
}, []);
```

## Future Development Guidelines

### When Adding New Features

1. **Avoid adding to dependency arrays** unless absolutely necessary
2. **Use refs for values needed in async operations** or cleanup
3. **Test pause/resume functionality** after any changes
4. **Verify cleanup** works properly when modal closes
5. **Check for memory leaks** using browser dev tools

### When Modifying State Management

1. **Never include callback functions** with frequently changing dependencies in effect arrays
2. **Use the ref-updating pattern** for state that needs to be accessed in cleanup
3. **Prefer direct operations** over callback functions in cleanup code
4. **Test auto-start behavior** after state changes

### When Debugging Issues

1. **Check browser console** for WebSocket connection errors
2. **Verify MediaRecorder state** matches component state
3. **Monitor network tab** for Deepgram API calls
4. **Use React DevTools** to track re-renders
5. **Check microphone permissions** in browser settings

### Performance Considerations

1. **Minimize re-renders** by avoiding unnecessary dependencies
2. **Use stable callbacks** for child components
3. **Debounce frequent operations** if adding real-time features
4. **Monitor WebSocket message frequency** to avoid overwhelming the UI

## Testing Checklist

Before deploying changes to the transcription system:

### Basic Functionality
- [ ] Modal opens and transcription starts automatically
- [ ] Browser microphone icon appears and stays active
- [ ] Waveform pillbox appears at bottom of transcript area
- [ ] Spoken words appear in transcript in real-time
- [ ] Transcript text is properly formatted with speaker labels

### Pause/Resume
- [ ] Pause button works and icon changes to play
- [ ] Pillbox remains visible when paused
- [ ] Resume button works and transcription continues
- [ ] No audio is processed while paused
- [ ] Edit detection works during pause state

### Error Handling
- [ ] Graceful handling of microphone permission denial
- [ ] WebSocket connection errors show appropriate messages
- [ ] Network interruptions don't crash the component
- [ ] Invalid API key shows helpful error message

### Cleanup and Resource Management
- [ ] Modal close stops transcription immediately
- [ ] No console errors when closing modal
- [ ] Microphone icon disappears when modal closes
- [ ] Re-opening modal starts fresh transcription session
- [ ] No memory leaks after multiple open/close cycles

### Edge Cases
- [ ] Works with multiple rapid open/close actions
- [ ] Handles browser tab switching gracefully
- [ ] Works after browser refresh
- [ ] Functions properly in demo mode vs regular mode

## Troubleshooting Guide

### Issue: Transcription starts then immediately stops
**Cause:** Cleanup effect running due to dependency changes  
**Solution:** Check dependency arrays for callback functions, use ref pattern

### Issue: Pillbox disappears when paused
**Cause:** AudioWaveform visibility logic incorrect  
**Solution:** Ensure `isRecording || isPaused` condition in AudioWaveform

### Issue: Memory leaks or browser slowdown
**Cause:** Resources not properly cleaned up  
**Solution:** Verify all three resource types are cleaned up in proper order

### Issue: Auto-start doesn't work
**Cause:** Effect dependencies or guard conditions  
**Solution:** Check `autoStartSessionRef` and `autoStartAttemptedRef` logic

### Issue: WebSocket connection fails
**Cause:** API key, network, or URL issues  
**Solution:** Check Deepgram API key and network connectivity

## API Dependencies

### Deepgram Configuration
- **Endpoint:** `wss://api.deepgram.com/v1/listen`
- **Model:** `nova-3-medical` (optimized for medical terminology)
- **Features:** `punctuate=true`, `interim_results=true`, `smart_format=true`, `diarize=true`
- **Authentication:** Token-based via WebSocket subprotocol

### Environment Variables
- `NEXT_PUBLIC_DEEPGRAM_API_KEY`: Required for transcription service

## Related Files and Components

- `src/components/modals/ConsultationPanel.tsx` - Main transcription logic
- `src/components/ui/AudioWaveform.tsx` - Visual controls and waveform
- `src/components/ui/rich-text-editor.tsx` - Transcript display and editing
- `src/lib/supabaseDataService.ts` - Database operations for encounters
- `src/hooks/demo/useDemoWorkspace.tsx` - Demo mode integration

This documentation should be updated whenever significant changes are made to the transcription system. 