'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useModalDragAndMinimize } from '@/hooks/useModalDragAndMinimize';
import { ModalDragAndMinimizeConfig } from '@/types/modal';

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
    // Temporarily disable draggable functionality to prevent overlay issues
    // Just render the children directly without the wrapper
    return (
      <div 
        ref={ref}
        className={cn("modal-content", className)}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DraggableModalWrapper.displayName = 'DraggableModalWrapper'; 