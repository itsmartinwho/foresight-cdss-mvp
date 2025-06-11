import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  ModalPosition, 
  DragState, 
  ModalDragAndMinimizeConfig, 
  UseModalDragAndMinimizeReturn,
  DragHandlers,
  ViewportBounds
} from '@/types/modal';
import { useModalManager } from '@/components/ui/modal-manager';

const DEFAULT_POSITION: ModalPosition = { x: 0, y: 0 };
const DRAG_THRESHOLD = 5; // Minimum pixels to move before starting drag
const MODAL_HEADER_HEIGHT = 60; // Approximate header height for positioning

export function useModalDragAndMinimize(
  config: ModalDragAndMinimizeConfig
): UseModalDragAndMinimizeReturn {
  // Defensive check to ensure config is properly defined
  if (!config || !config.id) {
    throw new Error('useModalDragAndMinimize: config with id is required');
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

  // Local drag state for smooth interaction
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    startPosition: DEFAULT_POSITION,
    currentPosition: DEFAULT_POSITION,
  });

  // Refs for drag event handling
  const dragStartPositionRef = useRef<ModalPosition>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<ModalPosition>({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Get current modal state from manager
  const modalState = getModalState(config.id);
  const isMinimized = modalState?.isMinimized ?? false;
  const position = modalState?.position ?? config.defaultPosition ?? getCenterPosition();
  const zIndex = modalState?.zIndex ?? 1000;

  // Register modal on mount
  useEffect(() => {
    registerModal(config);
    return () => unregisterModal(config.id);
  }, [config, registerModal, unregisterModal]);

  // Get viewport bounds
  const getViewportBounds = useCallback((): ViewportBounds => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, []);

  // Calculate default center position
  function getCenterPosition(): ModalPosition {
    const viewport = getViewportBounds();
    return {
      x: Math.max(0, (viewport.width - 600) / 2), // Assume 600px default width
      y: Math.max(0, (viewport.height - 400) / 2), // Assume 400px default height
    };
  }

  // Constrain position to viewport bounds
  const constrainPosition = useCallback((pos: ModalPosition, modalWidth = 600, modalHeight = 400): ModalPosition => {
    const viewport = getViewportBounds();
    const { constraints } = config;
    
    const minX = constraints?.minX ?? 0;
    const minY = constraints?.minY ?? MODAL_HEADER_HEIGHT; // Keep header visible
    const maxX = constraints?.maxX ?? viewport.width - modalWidth;
    const maxY = constraints?.maxY ?? viewport.height - MODAL_HEADER_HEIGHT;

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, [config, getViewportBounds]);

  // Drag event handlers
  const handleDragStart = useCallback((event: React.MouseEvent<HTMLElement>) => {
    // Only allow dragging from title bar/header area
    const target = event.target as HTMLElement;
    const titleBar = target.closest('[data-modal-title-bar]');
    if (!titleBar) return;

    // Prevent drag on interactive elements
    if (target.closest('button, input, select, textarea, [role="button"]')) {
      return;
    }

    event.preventDefault();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    
    dragStartPositionRef.current = { x: event.clientX, y: event.clientY };
    dragOffsetRef.current = { x: offsetX, y: offsetY };
    hasDraggedRef.current = false;

    bringToFront(config.id);

    setDragState(prev => ({
      ...prev,
      dragOffset: { x: offsetX, y: offsetY },
      startPosition: position,
    }));

    // Add global event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = 'none'; // Prevent text selection
  }, [position, config.id, bringToFront]);

  const handleDragMove = useCallback((event: MouseEvent) => {
    event.preventDefault();
    
    const startPos = dragStartPositionRef.current;
    const deltaX = event.clientX - startPos.x;
    const deltaY = event.clientY - startPos.y;
    
    // Check if we've moved enough to start dragging
    if (!hasDraggedRef.current) {
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance < DRAG_THRESHOLD) return;
      
      hasDraggedRef.current = true;
      setDragState(prev => ({ ...prev, isDragging: true }));
    }

    const newPosition = constrainPosition({
      x: position.x + deltaX,
      y: position.y + deltaY,
    });

    setDragState(prev => ({
      ...prev,
      currentPosition: newPosition,
    }));

    updateModalPosition(config.id, newPosition);
  }, [position, config.id, constrainPosition, updateModalPosition]);

  const handleDragEnd = useCallback((event: MouseEvent) => {
    event.preventDefault();
    
    // Clean up global listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = '';

    setDragState(prev => ({
      ...prev,
      isDragging: false,
    }));

    hasDraggedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDragMove]);

  // Modal actions
  const handleMinimize = useCallback(() => {
    minimizeModal(config.id);
  }, [config.id, minimizeModal]);

  const handleRestore = useCallback(() => {
    restoreModal(config.id);
  }, [config.id, restoreModal]);

  const handleClose = useCallback(() => {
    unregisterModal(config.id);
  }, [config.id, unregisterModal]);

  // Keyboard event handler for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalState?.isVisible && !isMinimized) {
        // Ctrl/Cmd + M to minimize
        if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
          event.preventDefault();
          handleMinimize();
        }
        // Escape to close (if not handled by modal itself)
        else if (event.key === 'Escape') {
          // Let the modal handle escape first, we'll only handle if not prevented
          if (!event.defaultPrevented) {
            handleClose();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalState?.isVisible, isMinimized, handleMinimize, handleClose]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMinimized && modalState?.position) {
        const constrainedPosition = constrainPosition(modalState.position);
        if (constrainedPosition.x !== modalState.position.x || constrainedPosition.y !== modalState.position.y) {
          updateModalPosition(config.id, constrainedPosition);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized, modalState?.position, constrainPosition, updateModalPosition, config.id]);

  // Drag handlers object
  const dragHandlers: DragHandlers = useMemo(() => ({
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
  }), [handleDragStart, handleDragMove, handleDragEnd]);

  // Style for the modal container
  const style: React.CSSProperties = useMemo(() => {
    if (isMinimized) {
      return { display: 'none' };
    }

    return {
      position: 'fixed',
      left: dragState.isDragging ? dragState.currentPosition.x : position.x,
      top: dragState.isDragging ? dragState.currentPosition.y : position.y,
      zIndex,
      transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
      transition: dragState.isDragging ? 'none' : 'transform 0.2s ease-out',
      opacity: dragState.isDragging ? 0.95 : 1,
      cursor: dragState.isDragging ? 'grabbing' : 'auto',
    };
  }, [isMinimized, dragState, position, zIndex]);

  // Accessibility props
  const dragProps = useMemo(() => ({
    role: 'dialog',
    'aria-grabbed': dragState.isDragging,
    'aria-describedby': `${config.id}-drag-instructions`,
    tabIndex: isMinimized ? -1 : 0,
  }), [dragState.isDragging, config.id, isMinimized]);

  return {
    // Position and state
    position: dragState.isDragging ? dragState.currentPosition : position,
    isMinimized,
    isDragging: dragState.isDragging,
    zIndex,
    
    // Event handlers
    dragHandlers,
    onMinimize: handleMinimize,
    onRestore: handleRestore,
    onClose: handleClose,
    
    // Style props
    style,
    
    // Accessibility props
    dragProps,
  };
} 