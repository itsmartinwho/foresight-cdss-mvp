'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useModalDragAndMinimize } from '@/hooks/useModalDragAndMinimize';
import { ModalDragAndMinimizeConfig } from '@/types/modal';
import { X, Minus } from '@phosphor-icons/react';

interface DraggableModalWrapperProps {
  config: ModalDragAndMinimizeConfig;
  onClose?: () => void;
  showMinimizeButton?: boolean;
  showCloseButton?: boolean;
  className?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

export const DraggableModalWrapper = forwardRef<HTMLDivElement, DraggableModalWrapperProps>(
  ({ 
    config, 
    onClose, 
    showMinimizeButton = true, 
    showCloseButton = true,
    className,
    children,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const {
      isMinimized,
      isDragging,
      minimize,
      containerProps,
      dragHandleProps,
    } = useModalDragAndMinimize(config);

    // Don't render if minimized
    if (isMinimized) {
      return null;
    }

    // Compute position style based on minimize state and drag state
    const positionStyle = React.useMemo(() => {
      if (isMinimized) return {};
      
      const pos = containerProps.style;
      
      // Check if we're at the initial center position and haven't been dragged
      // Get current window dimensions
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const isAtCenter = !isDragging && pos && 
        pos.left === `${Math.round(windowWidth / 2)}px` && 
        pos.top === `${Math.round(windowHeight / 2)}px`;
      
      if (isAtCenter) {
        // Use transform to center the modal
        return {
          ...pos,
          transform: 'translate(-50%, -50%)',
        };
      }
      
      // Otherwise use the position from containerProps
      return pos || {};
    }, [containerProps.style, isMinimized, isDragging]);

    return (
      <div 
        ref={ref}
        {...containerProps}
        className={cn(
          "glass rounded-lg shadow-xl overflow-hidden flex flex-col",
          isDragging && "modal-dragging",
          className
        )}
        data-testid={testId}
        {...props}
        style={positionStyle}
      >
        {/* Title bar with drag handle */}
        <div 
          {...dragHandleProps}
          className={cn(
            "modal-drag-handle flex items-center justify-between p-4 border-b border-white/10",
            dragHandleProps.className
          )}
          data-testid="modal-title-bar"
        >
          <div className="flex items-center gap-2">
            <h3 id={`${config.id}-title`} className="text-lg font-semibold">
              {config.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {showMinimizeButton && (
              <button
                onClick={minimize}
                className="modal-minimize-btn"
                aria-label="Minimize modal"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="modal-minimize-btn"
                aria-label="Close modal"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Modal content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* Screen reader instructions */}
        <div id={`${config.id}-drag-instructions`} className="sr-only">
          Drag the title bar to move this modal. Press Control+M to minimize or Escape to close.
        </div>
      </div>
    );
  }
);

DraggableModalWrapper.displayName = 'DraggableModalWrapper'; 