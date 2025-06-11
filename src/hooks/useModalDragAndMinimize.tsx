import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  ModalPosition, 
  DragState, 
  ModalDragAndMinimizeConfig, 
  UseModalDragAndMinimizeReturn
} from '@/types/modal';
import { useModalManager } from '@/components/ui/modal-manager';

const DRAG_THRESHOLD = 5; // Minimum pixels to move before starting drag
const MODAL_HEADER_HEIGHT = 60; // Approximate header height for positioning

function getCenterPosition(modalWidth = 600, modalHeight = 400): ModalPosition {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: Math.max(0, (window.innerWidth - modalWidth) / 2),
    y: Math.max(0, (window.innerHeight - modalHeight) / 2),
  };
}

export function useModalDragAndMinimize(
  config: ModalDragAndMinimizeConfig | null
): UseModalDragAndMinimizeReturn {
  // If no config is provided, return default (non-functional) props
  if (!config || !config.id) {
    return {
      isMinimized: false,
      isDragging: false,
      minimize: () => {},
      restore: () => {},
      close: () => {},
      containerProps: {
        style: {
          position: 'relative' as const,
        },
        role: "dialog" as const,
        "aria-modal": true as const,
        "aria-hidden": false,
        "aria-labelledby": '',
        "aria-describedby": '',
      },
      dragHandleProps: {
        onMouseDown: () => {},
        style: {
          cursor: 'default' as const,
        },
      },
    };
  }

  const { 
    registerModal, 
    unregisterModal, 
    getModalState, 
    updateModalPosition, 
    minimizeModal, 
    restoreModal,
    bringToFront 
  } = useModalManager();

  const initialPositionRef = useRef<ModalPosition | null>(null);
  if (initialPositionRef.current === null) {
    const persistedState = getModalState(config.id);
    if (persistedState?.position && !persistedState.isMinimized) {
      initialPositionRef.current = persistedState.position;
    } else {
      initialPositionRef.current = config.defaultPosition ?? getCenterPosition();
    }
  }

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
  });

  const modalState = getModalState(config.id);
  const isMinimized = modalState?.isMinimized ?? false;
  const position = modalState?.position ?? initialPositionRef.current ?? getCenterPosition();
  const zIndex = modalState?.zIndex ?? 1000;

  const handleDragMove = useCallback((event: MouseEvent) => {
    event.preventDefault();
    const newPosition = {
      x: event.clientX - dragState.dragOffset.x,
      y: event.clientY - dragState.dragOffset.y,
    };
    updateModalPosition(config.id, newPosition);
  }, [config.id, updateModalPosition, dragState.dragOffset]);

  const handleDragEnd = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = '';
  }, [handleDragMove]);

  const handleDragStart = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [role="button"]')) return;

    event.preventDefault();
    bringToFront(config.id);
    
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
  }, [position, config.id, bringToFront, handleDragMove, handleDragEnd]);

  useEffect(() => {
    registerModal(config);
    return () => unregisterModal(config.id);
  }, [config, registerModal, unregisterModal]);

  const minimize = useCallback(() => minimizeModal(config.id), [config.id, minimizeModal]);
  const restore = useCallback(() => restoreModal(config.id), [config.id, restoreModal]);
  const close = useCallback(() => unregisterModal(config.id), [config.id, unregisterModal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (getModalState(config.id)?.isVisible && !getModalState(config.id)?.isMinimized) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
          event.preventDefault();
          minimize();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.id, getModalState, minimize]);
  
  const containerProps = useMemo(() => ({
    style: {
      position: 'fixed' as const,
      left: position.x,
      top: position.y,
      zIndex,
      opacity: isMinimized ? 0 : 1,
      pointerEvents: (isMinimized ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
      transition: dragState.isDragging ? 'none' : 'opacity 0.2s, transform 0.2s',
    },
    role: "dialog" as const,
    "aria-modal": true as const,
    "aria-hidden": isMinimized,
    "aria-labelledby": `${config.id}-title`,
    "aria-describedby": `${config.id}-drag-instructions`,
  }), [position, zIndex, isMinimized, dragState.isDragging, config.id]);

  const dragHandleProps = useMemo(() => ({
    onMouseDown: handleDragStart,
    style: {
      cursor: dragState.isDragging ? 'grabbing' : 'grab',
    },
  }), [handleDragStart, dragState.isDragging]);

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