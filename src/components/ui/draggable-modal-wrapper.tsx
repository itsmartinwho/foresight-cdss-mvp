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

    // Use position style from containerProps directly
    const positionStyle = containerProps.style;

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
          className={cn(
            "modal-title-bar flex items-center justify-between p-4 border-b border-white/10",
            "relative" // Add relative positioning for button z-index
          )}
          data-testid="modal-title-bar"
        >
          {/* Invisible drag handle that covers the entire title bar */}
          <div 
            {...dragHandleProps}
            className={cn(
              "absolute inset-0", // Cover entire title bar
              "cursor-move",
              dragHandleProps.className
            )}
          />
          
          {/* Title - positioned above drag handle */}
          <div className="flex items-center gap-2 relative z-10 pointer-events-none">
            <h3 id={`${config.id}-title`} className="text-lg font-semibold">
              {config.title}
            </h3>
          </div>
          
          {/* Buttons - positioned above drag handle with pointer-events */}
          <div className="flex items-center gap-2 relative z-10">
            {showMinimizeButton && (
              <button
                onClick={minimize}
                className="modal-minimize-btn pointer-events-auto"
                aria-label="Minimize modal"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="modal-minimize-btn pointer-events-auto"
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