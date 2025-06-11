import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  ModalPosition, 
  DragState, 
  ModalDragAndMinimizeConfig, 
  UseModalDragAndMinimizeReturn
} from '@/types/modal';
import { useModalManager } from '@/components/ui/modal-manager';

const DRAG_THRESHOLD = 5; // Minimum pixels to move before starting drag

function getCenterPosition(modalWidth = 800, modalHeight = 600): ModalPosition {
  if (typeof window === 'undefined') return { x: 200, y: 100 };
  
  // Use the same logic as modalPersistence.ts for consistency
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Account for common UI elements
  const headerHeight = 80; // Space for header/navigation
  const bottomPadding = 40; // Bottom padding
  const sidePadding = 40; // Side padding

  // Calculate available space
  const availableWidth = viewport.width - (sidePadding * 2);
  const availableHeight = viewport.height - headerHeight - bottomPadding;

  // Adjust modal size if it's too large for viewport
  const effectiveModalWidth = Math.min(modalWidth, availableWidth);
  const effectiveModalHeight = Math.min(modalHeight, availableHeight);

  return {
    x: sidePadding + Math.max(0, (availableWidth - effectiveModalWidth) / 2),
    y: headerHeight + Math.max(0, (availableHeight - effectiveModalHeight) / 2),
  };
}

export function useModalDragAndMinimize(
  config: ModalDragAndMinimizeConfig | null
): UseModalDragAndMinimizeReturn {
  // Always call hooks first, then handle null config
  const { 
    registerModal, 
    unregisterModal, 
    getModalState, 
    updateModalPosition, 
    minimizeModal, 
    restoreModal,
    bringToFront 
  } = useModalManager();

  // Store initial position only once on first mount
  const initialPositionRef = useRef<ModalPosition | null>(null);
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
  });

  // Check if we have a valid config
  const isValidConfig = Boolean(config && config.id);

  // Initialize position only for valid configs
  if (isValidConfig && initialPositionRef.current === null) {
    const persistedState = getModalState(config!.id);
    if (persistedState?.position && !persistedState.isMinimized) {
      initialPositionRef.current = persistedState.position;
    } else if (config!.defaultPosition) {
      initialPositionRef.current = config!.defaultPosition;
    } else {
      // Default to center position
      initialPositionRef.current = getCenterPosition();
    }
  }

  const modalState = isValidConfig ? getModalState(config!.id) : undefined;
  const isMinimized = modalState?.isMinimized ?? false;
  const position = modalState?.position ?? initialPositionRef.current ?? getCenterPosition();
  const zIndex = modalState?.zIndex ?? 1000;

  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!isValidConfig) return;
    
    event.preventDefault();
    const newPosition = {
      x: event.clientX - dragState.dragOffset.x,
      y: event.clientY - dragState.dragOffset.y,
    };
    
    // Constrain to viewport bounds using the same logic as modalPersistence
    const headerHeight = 80;
    const bottomPadding = 20;
    const sidePadding = 20;
    const minVisibleWidth = 200; // Ensure at least this much is visible
    
    const maxX = Math.max(sidePadding, window.innerWidth - minVisibleWidth);
    const maxY = Math.max(headerHeight, window.innerHeight - bottomPadding - 50); // Ensure title bar is visible
    
    const constrainedPosition = {
      x: Math.max(sidePadding, Math.min(maxX, newPosition.x)),
      y: Math.max(headerHeight, Math.min(maxY, newPosition.y)),
    };
    
    updateModalPosition(config!.id, constrainedPosition);
  }, [config, isValidConfig, updateModalPosition, dragState.dragOffset]);

  const handleDragEnd = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = '';
  }, [handleDragMove]);

  const handleDragStart = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!isValidConfig) return;
    if (event.button !== 0) return; // Only handle left click
    const target = event.target as HTMLElement;
    
    // Don't start drag on interactive elements
    if (target.closest('button, input, select, textarea, [role="button"]')) return;

    event.preventDefault();
    bringToFront(config!.id);
    
    setDragState({
      isDragging: true,
      dragOffset: {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      },
      startPosition: position,
      currentPosition: position,
    });

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = 'none';
  }, [isValidConfig, position, config, bringToFront, handleDragMove, handleDragEnd]);

  // Register modal with manager
  useEffect(() => {
    if (isValidConfig) {
      registerModal(config!);
      return () => {
        unregisterModal(config!.id);
      };
    }
  }, [isValidConfig, config?.id, config?.title, config?.persistent, registerModal, unregisterModal]);

  // Modal management functions
  const minimize = useCallback(() => {
    if (isValidConfig) {
      minimizeModal(config!.id);
    }
  }, [config, isValidConfig, minimizeModal]);
  
  const restore = useCallback(() => {
    if (isValidConfig) {
      restoreModal(config!.id);
    }
  }, [config, isValidConfig, restoreModal]);
  
  const close = useCallback(() => {
    if (isValidConfig) {
      unregisterModal(config!.id);
    }
  }, [config, isValidConfig, unregisterModal]);

  // Keyboard shortcut support
  useEffect(() => {
    if (!isValidConfig) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (getModalState(config!.id)?.isVisible && !getModalState(config!.id)?.isMinimized) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
          event.preventDefault();
          minimize();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config, isValidConfig, getModalState, minimize]);
  
  // Container props for the modal - only add positioning, don't override existing styles
  const containerProps = useMemo(() => {
    if (!isValidConfig) {
      return {
        style: { position: 'relative' as const },
        className: '',
        role: "dialog" as const,
        "aria-modal": true as const,
        "aria-hidden": false,
        "aria-labelledby": '',
        "aria-describedby": '',
      };
    }

    return {
      style: {
        position: 'fixed' as const,
        left: position.x,
        top: position.y,
        zIndex,
        opacity: isMinimized ? 0 : 1,
        pointerEvents: (isMinimized ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
        transition: dragState.isDragging ? 'none' : 'opacity 0.2s, transform 0.2s',
      },
      className: dragState.isDragging ? 'modal-dragging' : 'modal-draggable',
      role: "dialog" as const,
      "aria-modal": true as const,
      "aria-hidden": isMinimized,
      "aria-labelledby": `${config!.id}-title`,
      "aria-describedby": `${config!.id}-drag-instructions`,
    };
  }, [isValidConfig, position, zIndex, isMinimized, dragState.isDragging, config]);

  // Drag handle props for the title bar
  const dragHandleProps = useMemo(() => {
    if (!isValidConfig) {
      return {
        onMouseDown: () => {},
        style: { cursor: 'default' as const },
        className: '',
      };
    }

    return {
      className: 'modal-drag-handle',
      onMouseDown: handleDragStart,
      style: {
        cursor: dragState.isDragging ? 'grabbing' : 'grab',
      },
    };
  }, [isValidConfig, handleDragStart, dragState.isDragging]);

  return {
    isMinimized,
    isDragging: dragState.isDragging,
    minimize,
    restore,
    close,
    containerProps,
    dragHandleProps,
  };
}

// Simple hook for regular (non-draggable) modals to register with ModalManager for overlay
export function useModalOverlay(modalId: string, isOpen: boolean) {
  const { registerModal, unregisterModal } = useModalManager();

  useEffect(() => {
    if (isOpen) {
      // Register a minimal config for overlay purposes
      const config: ModalDragAndMinimizeConfig = {
        id: modalId,
        title: 'Modal',
        persistent: false,
      };
      registerModal(config);
      return () => unregisterModal(modalId);
    }
  }, [isOpen, modalId, registerModal, unregisterModal]);
} 