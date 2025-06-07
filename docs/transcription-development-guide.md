# Transcription System Development Guide

## 🚨 Critical Warning for Developers

**DO NOT include the `stopTranscription` callback (or any cleanup callback) in useEffect dependency arrays.** This will cause an immediate start/stop cycle that breaks transcription functionality.

## Quick Reference: What NOT to Do

```typescript
// ❌ NEVER DO THIS - Will break transcription
useEffect(() => {
  return () => {
    stopTranscription(true);
  };
}, [isOpen, stopTranscription]); // stopTranscription in deps = broken

// ❌ NEVER DO THIS - Will cause re-render loops  
const someCallback = useCallback(() => {
  // ... logic
}, [isTranscribing, stopTranscription]); // stopTranscription in deps = broken
```

## Quick Reference: What TO Do

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

// ✅ CORRECT - Use refs for stable callbacks
const stableCallback = useCallback(() => {
  if (transcriptionActiveRef.current) {
    // Use refs, not state
  }
}, []); // No dependencies
```

## The Core Problem Solved

### What Was Happening
1. `stopTranscription` callback was included in useEffect dependency arrays
2. When `isTranscribing` state changed from `false` to `true`, React recreated the `stopTranscription` callback
3. useEffect saw a dependency change and re-ran
4. The cleanup function executed immediately, stopping transcription
5. Result: transcription started and stopped within milliseconds

### How It Was Fixed
1. **Removed `stopTranscription` from all dependency arrays**
2. **Created dedicated cleanup effect** that only depends on `isOpen`
3. **Used direct cleanup operations** instead of callback functions
4. **Implemented ref-based state tracking** for async operations

## Essential Patterns You Must Follow

### 1. The Ref-State Pattern

Always update both state and ref when transcription status changes:

```typescript
const setIsTranscribingAndRef = (val: boolean) => {
  setIsTranscribing(val);           // For UI reactivity
  transcriptionActiveRef.current = val;  // For cleanup/async access
};

// Use this instead of setIsTranscribing(true)
setIsTranscribingAndRef(true);
```

**Why:** Cleanup functions capture state at effect creation time. Refs provide current values for async operations.

### 2. The Cleanup Order Pattern

Always clean up resources in this exact order:

```typescript
// 1. MediaRecorder (most critical)
if(mediaRecorderRef.current) {
  try {
    if(mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  } catch {} 
  mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
  mediaRecorderRef.current = null;
}

// 2. Audio stream tracks
audioStreamRef.current?.getTracks().forEach(t => t.stop());
audioStreamRef.current = null;

// 3. WebSocket connection
if(socketRef.current) {
  try { socketRef.current.close(); } catch {} 
  socketRef.current = null;
}

// 4. State updates
setIsTranscribingAndRef(false);
setIsPaused(false);
```

### 3. The Stable Callback Pattern

For callbacks passed to child components:

```typescript
// ✅ CORRECT - No dependencies, uses refs
const handleSomeAction = useCallback(() => {
  if (transcriptionActiveRef.current) {
    // Direct operations using refs
    mediaRecorderRef.current?.stop();
  }
}, []); // Empty dependency array

// Pass to child component
<AudioWaveform onStop={handleSomeAction} />
```

### 4. The Auto-Start Protection Pattern

Prevent infinite auto-start loops:

```typescript
const autoStartAttemptedRef = useRef<Set<string>>(new Set());

// In your auto-start logic
if (autoStartAttemptedRef.current.has(encounterId)) {
  console.log('Auto-start already attempted for encounter:', encounterId);
  return;
}
autoStartAttemptedRef.current.add(encounterId);
// ... proceed with auto-start
```

## Debugging Checklist

When transcription isn't working:

1. **Check console for the critical log message**: `"[ConsultationPanel] Cleanup: Stopping transcription on true close/unmount"`
   - If you see this immediately after starting = dependency issue
   
2. **Verify refs are being updated**:
   ```typescript
   console.log('transcriptionActiveRef:', transcriptionActiveRef.current);
   console.log('isTranscribing state:', isTranscribing);
   ```

3. **Check MediaRecorder state**:
   ```typescript
   console.log('MediaRecorder state:', mediaRecorderRef.current?.state);
   ```

4. **Monitor useEffect re-runs**:
   ```typescript
   useEffect(() => {
     console.log('Effect running due to dependency change');
     // ... effect logic
   }, [/* check these dependencies */]);
   ```

## Testing Your Changes

### Must-Test Scenarios

1. **Basic Flow**:
   - Open "New Consultation"
   - Verify transcription starts automatically
   - Verify browser microphone icon stays active
   - Speak and verify text appears

2. **Pause/Resume**:
   - Click pause, verify pillbox stays visible
   - Click resume, verify transcription continues
   - Check that no cleanup logs appear during pause/resume

3. **Modal Close**:
   - Close modal and verify cleanup happens once
   - Reopen modal and verify fresh start
   - Check console for any error messages

### Red Flags in Console

❌ **Bad**: `"[ConsultationPanel] Cleanup: Stopping transcription on true close/unmount"` appearing immediately after start  
❌ **Bad**: Multiple rapid start/stop messages  
❌ **Bad**: WebSocket connection errors during normal operation  
❌ **Bad**: MediaRecorder state errors  

✅ **Good**: Transcription starts and stays active  
✅ **Good**: Clean startup and shutdown logs  
✅ **Good**: Stable pause/resume behavior  

## Common Changes and Their Risks

### Adding New Transcription Features

**Risk Level: HIGH**
- Any change to transcription state management
- Adding new useEffect hooks
- Modifying cleanup logic

**Safe Approach:**
1. Never add `stopTranscription` to dependency arrays
2. Use the ref pattern for any async state access
3. Test pause/resume after changes

### Modifying UI Components

**Risk Level: MEDIUM**
- Changes to AudioWaveform component
- Modifications to ConsultationPanel render logic

**Safe Approach:**
1. Ensure callbacks passed to children are stable
2. Don't change the transcription state flow
3. Test UI state synchronization

### Adding New Modal Features

**Risk Level: LOW**
- Adding form fields, buttons, or UI elements
- Non-transcription related functionality

**Safe Approach:**
1. Avoid interfering with existing useEffect hooks
2. Don't add transcription-related logic to new features

## File Modification Guidelines

### ConsultationPanel.tsx - HIGH RISK
- **Critical sections**: useEffect hooks, transcription callbacks
- **Safe sections**: UI rendering, form handling
- **Before modifying**: Understand the ref-state pattern
- **Always test**: Auto-start, pause/resume, cleanup

### AudioWaveform.tsx - MEDIUM RISK  
- **Critical sections**: Props handling, visibility logic
- **Safe sections**: Visual styling, waveform display
- **Before modifying**: Understand parent-child callback flow
- **Always test**: Pillbox visibility during pause/resume

### Other Components - LOW RISK
- Changes to unrelated components are generally safe
- Be cautious if passing new props to ConsultationPanel

## Emergency Fixes

If you break transcription and need a quick fix:

1. **Revert your changes** to the last working commit
2. **Check git log** for recent transcription-related commits
3. **Look for these patterns** in your code:
   - `stopTranscription` in dependency arrays
   - Missing cleanup order
   - State accessed in cleanup functions instead of refs

## When to Ask for Help

**Immediately ask for help if:**
- Transcription starts and stops in a loop
- You see the cleanup message immediately after starting
- You're not sure about dependency arrays
- You're modifying core transcription logic

**You can probably proceed if:**
- Adding UI elements unrelated to transcription
- Making styling changes
- Working on other modal features

## Version History

- **v1.0** (December 2024): Initial implementation with race condition bug
- **v1.1** (December 2024): Fixed with ref-based cleanup pattern

## Related Documentation

- `transcription-system-documentation.md` - Complete technical documentation
- `transcription-fix-notes.md` - Historical context about the fix
- `ConsultationPanel.tsx` - Implementation details in code comments 