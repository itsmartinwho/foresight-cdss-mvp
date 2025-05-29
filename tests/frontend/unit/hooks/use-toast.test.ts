import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { reducer, toast, useToast } from '@/hooks/use-toast'; // Adjust path as necessary
import type { ToastProps, ToastActionElement } from "@/components/ui/toast"; // Assuming this is the correct path
import { act, renderHook } from '@testing-library/react';

// Define a minimal ToasterToast type for testing if the actual one is complex
// Based on ToasterToast in use-toast.ts
type ToasterTestToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  open?: boolean; // Ensure open is part of it
  onOpenChange?: (open: boolean) => void; // Ensure onOpenChange is part of it
};


const createSampleToast = (overrides: Partial<ToasterTestToast> = {}): ToasterTestToast => ({
  id: Math.random().toString(36).substring(7),
  title: 'Test Toast',
  description: 'This is a test toast.',
  variant: 'default',
  open: true,
  ...overrides,
});

// Initial state for pure reducer tests
const getInitialReducerState = () => ({ toasts: [] });

describe('Toast Reducer (Pure)', () => {
  // No beforeEach needed here if we are testing reducer as a pure function

  it('should add a toast with ADD_TOAST', () => {
    const newToast = createSampleToast({ id: '1' });
    const action = { type: 'ADD_TOAST' as const, toast: newToast };
    const state = reducer(getInitialReducerState(), action);
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toEqual(newToast);
  });

  it('should respect TOAST_LIMIT when adding with ADD_TOAST', () => {
    const toast1 = createSampleToast({ id: '1' });
    const toast2 = createSampleToast({ id: '2' });
    let state = reducer(getInitialReducerState(), { type: 'ADD_TOAST' as const, toast: toast1 });
    // TOAST_LIMIT is 1, so adding another should replace the first
    state = reducer(state, { type: 'ADD_TOAST' as const, toast: toast2 });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toEqual(toast2);
  });

  it('should update a toast with UPDATE_TOAST', () => {
    const initialToast = createSampleToast({ id: '1', title: 'Initial Title' });
    const stateWithToast = { toasts: [initialToast] };
    const updatedProps = { id: '1', title: 'Updated Title' };
    const action = { type: 'UPDATE_TOAST' as const, toast: updatedProps };
    const state = reducer(stateWithToast, action);
    expect(state.toasts[0].title).toBe('Updated Title');
  });

  it('should set open to false for a specific toast with DISMISS_TOAST', () => {
    // Not using fake timers here as reducer itself doesn't schedule them
    const toast1 = createSampleToast({ id: '1', open: true });
    const toast2 = createSampleToast({ id: '2', open: true });
    const stateWithToasts = { toasts: [toast1, toast2] };
    const action = { type: 'DISMISS_TOAST' as const, toastId: '1' };
    const state = reducer(stateWithToasts, action);
    expect(state.toasts.find(t => t.id === '1')?.open).toBe(false);
    expect(state.toasts.find(t => t.id === '2')?.open).toBe(true);
  });

  it('should set open to false for all toasts with DISMISS_TOAST if no toastId', () => {
    const toast1 = createSampleToast({ id: '1', open: true });
    const toast2 = createSampleToast({ id: '2', open: true });
    const stateWithToasts = { toasts: [toast1, toast2] };
    const action = { type: 'DISMISS_TOAST' as const };
    const state = reducer(stateWithToasts, action);
    expect(state.toasts.every(t => !t.open)).toBe(true);
  });

  it('should remove a specific toast with REMOVE_TOAST', () => {
    const toast1 = createSampleToast({ id: '1' });
    const toast2 = createSampleToast({ id: '2' });
    const stateWithToasts = { toasts: [toast1, toast2] };
    const action = { type: 'REMOVE_TOAST' as const, toastId: '1' };
    const state = reducer(stateWithToasts, action);
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].id).toBe('2');
  });

  it('should remove all toasts with REMOVE_TOAST if no toastId', () => {
    const toast1 = createSampleToast({ id: '1' });
    const toast2 = createSampleToast({ id: '2' });
    const stateWithToasts = { toasts: [toast1, toast2] };
    const action = { type: 'REMOVE_TOAST' as const };
    const state = reducer(stateWithToasts, action);
    expect(state.toasts).toHaveLength(0);
  });
});

describe('useToast Hook and toast Function', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset internal memoryState before each test by dismissing all toasts
    // This ensures clean state for each hook/function test.
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss(); // Dismiss all existing toasts via the hook
    });
    // Advance timers to ensure REMOVE_TOAST from previous dismissals are processed
    // if they were queued by the dismiss call.
    act(() => {
      vi.runAllTimers();
    });
  });

  afterEach(() => {
    vi.clearAllTimers(); // Clear any remaining timers
    vi.useRealTimers(); // Restore real timers
  });

  it('should add a toast using toast() and reflect in useToast()', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      toast({ title: 'New Toast', description: 'A new toast appears!' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('New Toast');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('toast() should return id, dismiss, and update functions', () => {
    const { result: hookResult } = renderHook(() => useToast()); // Render hook to initialize listeners
    let toastControls;
    
    act(() => {
      // This toast call itself triggers state updates.
      toastControls = toast({ title: 'Test' });
    });

    expect(toastControls).toHaveProperty('id');
    expect(toastControls).toHaveProperty('dismiss');
    expect(toastControls).toHaveProperty('update');
    expect(typeof toastControls?.id).toBe('string');
    expect(typeof toastControls?.dismiss).toBe('function');
    expect(typeof toastControls?.update).toBe('function');
    
    // Check that the toast was actually added to the state
    expect(hookResult.current.toasts).toHaveLength(1);
    expect(hookResult.current.toasts[0].id).toBe(toastControls?.id);
  });
  
  it('should update a toast using the update function from toast()', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
      t = toast({ title: 'Original Title' });
    });

    expect(result.current.toasts[0].title).toBe('Original Title');

    act(() => {
      t?.update({ id: t.id, title: 'Updated Title Via Controls' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title Via Controls');
  });

  it('should dismiss a toast using the dismiss function from toast() and then remove it', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
      t = toast({ title: 'Dismissible Toast' });
    });
    expect(result.current.toasts.find(toast => toast.id === t?.id)?.open).toBe(true);

    act(() => {
      t?.dismiss();
    });
    expect(result.current.toasts.find(toast => toast.id === t?.id)?.open).toBe(false);
    
    act(() => {
      vi.advanceTimersByTime(1000000); // TOAST_REMOVE_DELAY
    });
    expect(result.current.toasts.find(toast => toast.id === t?.id)).toBeUndefined();
  });

  it('should dismiss a toast using dismiss() from useToast() hook and then remove it', () => {
    const { result } = renderHook(() => useToast());
    let toastInstance;
    act(() => {
      toastInstance = toast({ title: 'Another Toast' });
    });
    expect(result.current.toasts.find(toast => toast.id === toastInstance?.id)?.open).toBe(true);

    act(() => {
      result.current.dismiss(toastInstance?.id);
    });
    expect(result.current.toasts.find(toast => toast.id === toastInstance?.id)?.open).toBe(false);
    
    act(() => {
      vi.advanceTimersByTime(1000000); // TOAST_REMOVE_DELAY
    });
    expect(result.current.toasts.find(toast => toast.id === toastInstance?.id)).toBeUndefined();
  });

   it('onOpenChange callback should dismiss the toast when open becomes false and then remove it', () => {
    const { result } = renderHook(() => useToast());
    let toastId;

    act(() => {
      const t = toast({ title: 'Test onOpenChange' });
      toastId = t.id;
    });

    expect(result.current.toasts.find(t => t.id === toastId)?.open).toBe(true);

    const toastToUpdate = result.current.toasts.find(t => t.id === toastId);
    if (toastToUpdate && toastToUpdate.onOpenChange) {
      act(() => {
        toastToUpdate.onOpenChange?.(false);
      });
    }
    
    expect(result.current.toasts.find(t => t.id === toastId)?.open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000000); // TOAST_REMOVE_DELAY
    });
    expect(result.current.toasts.find(t => t.id === toastId)).toBeUndefined();
  });
});
