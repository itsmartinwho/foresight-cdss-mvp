import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  ModalPosition, 
  DragState, 
  ModalDragAndMinimizeConfig, 
  UseModalDragAndMinimizeReturn
} from '@/types/modal';
import { useModalManager } from '@/components/ui/modal-manager';
import { usePathname } from 'next/navigation';

const DRAG_THRESHOLD = 5; // Minimum pixels to move before starting drag

function getCenterPosition(estimatedWidth: number = 512, estimatedHeight: number = 600): ModalPosition {
  if (typeof window === 'undefined') return { x: 200, y: 100 };
  
  // Get viewport dimensions
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  
  // Calculate position to center the modal
  const centerX = Math.round((viewport.width - estimatedWidth) / 2);
  const centerY = Math.round((viewport.height - estimatedHeight) / 2);

  // Ensure modal stays within viewport bounds with some padding
  const x = Math.max(50, centerX);
  const y = Math.max(50, centerY);

  return { x, y };
}

export function useModalDragAndMinimize(
  config: ModalDragAndMinimizeConfig | null
): UseModalDragAndMinimizeReturn {
  const pathname = usePathname();
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
  const isMountedRef = useRef(false);
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
  });

  const dragOffsetRef = useRef<{x:number;y:number}>({x:0,y:0});

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
      // Default to center position based on modal type
      const estimatedWidth = config!.id.includes('new-consultation') ? 800 : config!.id.includes('consultation') ? 800 : 512;
      const estimatedHeight = (config!.id.includes('consultation') || config!.id.includes('new-consultation')) ? 600 : 600;
      initialPositionRef.current = getCenterPosition(estimatedWidth, estimatedHeight);
    }
  }

  const modalState = isValidConfig ? getModalState(config!.id) : undefined;
  const isMinimized = modalState?.isMinimized ?? false;
  const position = modalState?.position ?? initialPositionRef.current ?? getCenterPosition(512, 600);
  const zIndex = modalState?.zIndex ?? 1000;

  // Keep a ref with the latest position so callbacks don't re-create when position changes
  const positionRef = useRef(position);

  // Sync ref whenever position updates
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!isValidConfig) return;
    
    event.preventDefault();
    const newPosition = {
      x: event.clientX - dragOffsetRef.current.x,
      y: event.clientY - dragOffsetRef.current.y,
    };
    
    // Constrain to viewport bounds but allow going above viewport
    const minVisibleWidth = 100; // Ensure at least this much width is visible
    const minVisibleHeight = 30; // Ensure at least the title bar is visible
    
    // Allow dragging above viewport (negative y) and to the left (negative x)
    const minX = -window.innerWidth + minVisibleWidth;
    const minY = -300; // Allow dragging 300px above viewport
    const maxX = window.innerWidth - minVisibleWidth;
    const maxY = window.innerHeight - minVisibleHeight;
    
    const constrainedPosition = {
      x: Math.max(minX, Math.min(maxX, newPosition.x)),
      y: Math.max(minY, Math.min(maxY, newPosition.y)),
    };
    
    setDragState(prev => {
      // Guard against unnecessary state updates to prevent infinite loops
      if (prev.currentPosition.x === constrainedPosition.x && 
          prev.currentPosition.y === constrainedPosition.y) {
        return prev;
      }
      return { ...prev, currentPosition: constrainedPosition };
    });
  }, [isValidConfig]);

  const handleDragEnd = useCallback(() => {
    setDragState(prev => {
      // Guard against unnecessary state updates to prevent infinite loops
      if (prev.isDragging === false) {
        return prev;
      }
      
      // Get current position from state
      const finalPosition = prev.currentPosition;
      
      // Update modal position after state update
      if (isValidConfig && config) {
        // Use setTimeout to ensure state updates are complete
        setTimeout(() => {
          updateModalPosition(config.id, finalPosition);
        }, 0);
      }
      
      return { ...prev, isDragging: false };
    });
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = '';
  }, [isValidConfig, config, handleDragMove, updateModalPosition]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isValidConfig) return;
    
    e.preventDefault();
    
    // Update the ref directly to avoid state updates
    const offset = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    dragOffsetRef.current = offset;
    
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      dragOffset: offset,
      currentPosition: position
    }));
    
    // Add event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = 'none';
  }, [isValidConfig, position, handleDragMove, handleDragEnd]);

  // Register modal with manager
  useEffect(() => {
    if (isValidConfig && !isMountedRef.current) {
      isMountedRef.current = true;
      registerModal(config!, pathname);
    }
    
    return () => {
      if (isValidConfig && isMountedRef.current) {
        // Simple cleanup - just unregister when component unmounts
        // The modal manager will handle persistence for minimized modals
        isMountedRef.current = false;
        unregisterModal(config!.id);
      }
    };
  }, [isValidConfig, config, registerModal, unregisterModal, pathname]);

  // Modal management functions
  const minimize = useCallback(() => {
    if (!isValidConfig || !config) return;
      minimizeModal(config.id);
  }, [isValidConfig, minimizeModal, config]);
  
  const restore = useCallback(() => {
    if (!isValidConfig || !config) return;
    restoreModal(config.id);
  }, [isValidConfig, restoreModal, config]);
  
  const bringModalToFront = useCallback(() => {
    if (!isValidConfig || !config) return;
    bringToFront(config.id);
  }, [isValidConfig, bringToFront, config]);

  const close = useCallback(() => {
    if (!isValidConfig || !config) return;
    unregisterModal(config.id);
  }, [isValidConfig, unregisterModal, config]);

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
        left: dragState.isDragging ? dragState.currentPosition.x : position.x,
        top: dragState.isDragging ? dragState.currentPosition.y : position.y,
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
  }, [
    isValidConfig, 
    position.x, 
    position.y, 
    zIndex, 
    isMinimized, 
    dragState.isDragging,
    dragState.currentPosition.x,
    dragState.currentPosition.y,
    config
  ]);

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



  // Memoize the return object to ensure stable object identity and prevent infinite re-renders
  return useMemo(() => ({
    isMinimized,
    isDragging: dragState.isDragging,
    minimize,
    restore,
    bringModalToFront,
    close,
    containerProps,
    dragHandleProps,
  }), [
    isMinimized,
    dragState.isDragging,
    minimize,
    restore,
    bringModalToFront,
    close,
    containerProps,
    dragHandleProps,
  ]);
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