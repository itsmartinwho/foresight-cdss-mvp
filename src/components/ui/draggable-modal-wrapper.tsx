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