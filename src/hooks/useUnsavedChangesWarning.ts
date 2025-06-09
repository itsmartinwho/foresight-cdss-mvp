'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UnsavedChangesOptions {
  when: boolean;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function useUnsavedChangesWarning({
  when,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onConfirm,
  onCancel,
}: UnsavedChangesOptions) {
  const router = useRouter();
  const savedCallbacks = useRef({ onConfirm, onCancel });

  // Update refs when callbacks change
  useEffect(() => {
    savedCallbacks.current = { onConfirm, onCancel };
  }, [onConfirm, onCancel]);

  // Handle browser back/forward/refresh
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);

  // Create a warning function that can be used with navigation
  const confirmNavigation = useCallback(
    (callback: () => void) => {
      if (!when) {
        callback();
        return;
      }

      const confirmed = window.confirm(message);
      
      if (confirmed) {
        savedCallbacks.current.onConfirm?.();
        callback();
      } else {
        savedCallbacks.current.onCancel?.();
      }
    },
    [when, message]
  );

  // Create wrapper for router navigation
  const safeNavigate = useCallback(
    (url: string) => {
      confirmNavigation(() => {
        router.push(url);
      });
    },
    [confirmNavigation, router]
  );

  // Create wrapper for router replacement
  const safeReplace = useCallback(
    (url: string) => {
      confirmNavigation(() => {
        router.replace(url);
      });
    },
    [confirmNavigation, router]
  );

  // Create wrapper for router back
  const safeBack = useCallback(() => {
    confirmNavigation(() => {
      router.back();
    });
  }, [confirmNavigation, router]);

  return {
    confirmNavigation,
    safeNavigate,
    safeReplace,
    safeBack,
  };
} 