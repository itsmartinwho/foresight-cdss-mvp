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
- **Continuous Operation**: The system now handles conversation pauses and automatically reconnects if the connection is lost.

## System Architecture

### Key Components

- **`ConsultationPanel.tsx`**: The main container for the consultation UI, responsible for managing the transcription lifecycle.
- **`AudioWaveform.tsx`**: The visual component for audio input with control buttons.
- **Deepgram WebSocket**: The service used for real-time speech-to-text processing with enhanced parameters for handling silence.

### Enhanced Deepgram Configuration

The system now uses optimized Deepgram parameters to handle conversation pauses and silence:

```typescript
const wsUrl = 'wss://api.deepgram.com/v1/listen?' + new URLSearchParams({
  model: 'nova-3-medical',
  punctuate: 'true',
  interim_results: 'true',
  smart_format: 'true',
  diarize: 'true',
  utterance_end_ms: '3000', // Detect utterance end after 3 seconds of silence
  endpointing: 'false', // Disable automatic endpointing to prevent premature closures
  vad_events: 'true' // Enable voice activity detection events
}).toString();
```

### KeepAlive Mechanism

To prevent connection timeouts during conversation pauses, the system implements a KeepAlive mechanism:

- **Purpose**: Prevents Deepgram's 10-second inactivity timeout
- **Frequency**: Sends KeepAlive messages every 5 seconds
- **Implementation**: Automatic JSON messages sent to maintain the WebSocket connection

```typescript
// KeepAlive mechanism to prevent connection timeouts during silence
let keepAliveInterval: NodeJS.Timeout | null = null;

// Start KeepAlive messages every 5 seconds to prevent 10-second timeout
keepAliveInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "KeepAlive" }));
    console.log("Sent KeepAlive message");
  }
}, 5000);
```

### Automatic Reconnection

The system now includes intelligent reconnection logic:

- **Trigger Conditions**: Reconnects when connection is lost unexpectedly (not user-initiated)
- **Timing**: Waits 2 seconds before attempting reconnection to avoid rapid loops
- **Safety Checks**: Only reconnects if transcription should still be active and not paused

```typescript
// Only attempt reconnection if the transcription is still supposed to be active
// and it wasn't a user-initiated close (code 1000) or going away (code 1001)
if (transcriptionActiveRef.current && !isPausedRef.current && event.code !== 1000 && event.code !== 1001) {
  console.log('Connection lost unexpectedly, attempting reconnection...');
  
  // Wait a short time before reconnecting to avoid rapid reconnection loops
  setTimeout(() => {
    if (transcriptionActiveRef.current && !isPausedRef.current && isOpen) {
      console.log('Attempting automatic reconnection...');
      startVoiceInput(); // Recursive call to restart transcription
    }
  }, 2000);
}
```

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

1.  **KeepAlive Interval**: Clear the KeepAlive interval first.
2.  **MediaRecorder**: Stop the recorder and its tracks.
3.  **Audio Stream**: Stop all tracks on the audio stream.
4.  **WebSocket**: Close the connection.
5.  **State**: Update `isTranscribing` and `isPaused` state to `false`.

### 2. The Stable Callback Pattern

When passing callbacks to child components, ensure they are stable by using `useCallback` with an empty dependency array and accessing any required state via refs. This prevents unnecessary re-renders.

### 3. The Auto-Start Protection Pattern

To prevent infinite loops of transcription auto-starting, use a ref to track whether an auto-start has already been attempted for a given encounter.

### 4. The Resilient Connection Pattern

The system now implements resilient connection handling:
- KeepAlive messages prevent timeout disconnections
- Automatic reconnection handles unexpected connection losses
- Proper event handling for different types of WebSocket closures

## Debugging and Testing

### Debugging Checklist

1.  **Check Console Logs**: Look for the critical log message: `"[ConsultationPanel] Cleanup: Stopping transcription on true close/unmount"`. If it appears immediately after starting, you have a dependency issue.
2.  **Verify Refs and State**: Ensure `transcriptionActiveRef.current` and the `isTranscribing` state are in sync.
3.  **Check MediaRecorder State**: Log `mediaRecorderRef.current?.state` to see if it's `'recording'`, `'paused'`, or `'inactive'`.
4.  **Monitor KeepAlive Messages**: Look for regular "Sent KeepAlive message" logs every 5 seconds during active transcription.
5.  **Watch Reconnection Attempts**: Monitor for "Connection lost unexpectedly, attempting reconnection..." messages.

### Must-Test Scenarios

- **Basic Flow**: Start, speak, see text.
- **Pause/Resume**: Pause and resume transcription, ensuring it continues correctly.
- **Conversation Pauses**: Test with natural conversation pauses (3+ seconds) to ensure connection stays alive.
- **Network Interruption**: Test with brief network interruptions to verify automatic reconnection.
- **Modal Close**: Close the modal and verify that all resources are cleaned up properly (e.g., the browser microphone icon disappears).

### New Testing Scenarios

- **Long Silence Periods**: Test with periods of silence longer than 10 seconds to verify KeepAlive functionality.
- **Connection Recovery**: Temporarily disable network connection and verify automatic reconnection works.
- **Speech Detection Events**: Monitor console for UtteranceEnd and SpeechStarted events during natural conversation.

## API and Dependencies

- **Deepgram API**: The system uses the Deepgram API for speech-to-text.
    - **Endpoint:** `wss://api.deepgram.com/v1/listen`
    - **Model:** `nova-3-medical`
    - **Enhanced Parameters:**
        - `utterance_end_ms=3000`: Detects utterance end after 3 seconds
        - `endpointing=false`: Disables automatic endpointing to prevent premature closures
        - `vad_events=true`: Enables voice activity detection events
- **Environment Variables**:
    - `NEXT_PUBLIC_DEEPGRAM_API_KEY`: Required for the transcription service.

## Troubleshooting Common Issues

### Transcription Stops During Conversation Pauses

**Symptoms**: Transcription stops working after periods of silence in conversation.

**Solution**: This should now be resolved with the KeepAlive mechanism. If it still occurs:
1. Check console for KeepAlive messages being sent every 5 seconds
2. Verify the WebSocket connection isn't being closed with code 1000 or 1001
3. Monitor for automatic reconnection attempts

### Cannot Restart Transcription After Connection Loss

**Symptoms**: Transcription buttons become unresponsive after a connection loss.

**Solution**: The system now automatically reconnects. If manual restart is needed:
1. Check if `transcriptionActiveRef.current` is properly set to `false`
2. Verify all audio resources are cleaned up before restarting
3. Monitor console for reconnection attempt logs

### Frequent Disconnections

**Symptoms**: WebSocket connections frequently close and reconnect.

**Investigation Steps**:
1. Check network stability
2. Verify Deepgram API key is valid
3. Monitor for error messages in WebSocket error handlers
4. Check if KeepAlive messages are being sent successfully 