'use client';

import React, { forwardRef, ReactNode, ComponentType } from 'react';
import { Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModalDragAndMinimize } from '@/hooks/useModalDragAndMinimize';
import { ModalDragAndMinimizeConfig } from '@/types/modal';

interface DraggableModalWrapperProps {
  children: ReactNode;
  config: ModalDragAndMinimizeConfig;
  onClose?: () => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  showMinimizeButton?: boolean;
  showCloseButton?: boolean;
  customHeader?: ReactNode;
}

export const DraggableModalWrapper = forwardRef<HTMLDivElement, DraggableModalWrapperProps>(
  ({
    children,
    config,
    onClose,
    className,
    headerClassName,
    contentClassName,
    showMinimizeButton = true,
    showCloseButton = true,
    customHeader,
  }, ref) => {
    const { 
      containerProps, 
      dragHandleProps, 
      minimize,
      close, 
      isMinimized,
    } = useModalDragAndMinimize(config);

    const handleClose = () => {
      if (onClose) {
        onClose();
      } else {
        close();
      }
    };

    if (isMinimized) {
      return null;
    }

    const IconComponent = typeof config.icon === 'function' ? config.icon : null;

    return (
      <>
        <div id={`${config.id}-drag-instructions`} className="sr-only">
          Press space or enter to grab this modal and move it around the screen. 
          Use arrow keys to move when grabbed. Press escape to release.
          Press Ctrl+M (Cmd+M on Mac) to minimize this modal.
        </div>

        <div
          ref={ref}
          className={cn(
            'modal-draggable',
            'glass',
            'rounded-lg',
            'shadow-2xl',
            'border border-white/20',
            'overflow-hidden',
            'flex flex-col',
            className
          )}
          {...containerProps}
        >
          <div
            id={`${config.id}-title`}
            data-modal-title-bar="true"
            className={cn(
              'modal-drag-handle',
              'flex items-center justify-between',
              'px-4 py-3',
              'border-b border-white/10',
              'min-h-[56px]',
              'select-none',
              headerClassName
            )}
            {...dragHandleProps}
          >
            {customHeader ? (
              customHeader
            ) : (
              <div className="flex items-center gap-3 flex-1">
                {IconComponent && (
                  <IconComponent className="w-5 h-5 text-white/80 flex-shrink-0" />
                )}
                {typeof config.icon === 'string' && (
                  <span className="text-lg">{config.icon}</span>
                )}
                <h2 className="text-lg font-semibold text-white/90 truncate">
                  {config.title}
                </h2>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0">
              {showMinimizeButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    minimize();
                  }}
                  className="modal-minimize-btn"
                  aria-label={`Minimize ${config.title}`}
                  title={`Minimize ${config.title} (Ctrl+M)`}
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
              
              {showCloseButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="modal-minimize-btn hover:bg-red-500/20 hover:text-red-400"
                  aria-label={`Close ${config.title}`}
                  title={`Close ${config.title}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className={cn('flex-1 overflow-auto', 'p-6', contentClassName)}>
            {children}
          </div>
        </div>
      </>
    );
  }
);

DraggableModalWrapper.displayName = 'DraggableModalWrapper'; 