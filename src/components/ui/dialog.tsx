"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Minus } from '@phosphor-icons/react';
import ReactDOM from 'react-dom';

import { cn } from "@/lib/utils"
import { DraggableModalWrapper } from './draggable-modal-wrapper';
import { ModalDragAndMinimizeConfig } from '@/types/modal';
import { useModalDragAndMinimize } from '@/hooks/useModalDragAndMinimize';

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[9999] glass-backdrop data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Scroll locking is now handled centrally by ModalManager
  
  return (
    <DialogPortal>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "relative grid w-full max-w-lg gap-4 rounded-lg p-6 shadow-lg glass pointer-events-auto",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// Draggable Dialog Components
interface DraggableDialogContentProps extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'className'> {
  draggable?: boolean;
  draggableConfig?: ModalDragAndMinimizeConfig;
  className?: string;
  onClose?: () => void;
  showMinimizeButton?: boolean;
  showCloseButton?: boolean;
}

const DraggableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DraggableDialogContentProps
>(({ 
  className, 
  children, 
  draggable = false,
  draggableConfig,
  onClose,
  showMinimizeButton = true,
  showCloseButton = true,
  ...props 
}, ref) => {
  // Debug logging
  React.useEffect(() => {
    if (draggable && draggableConfig) {
      console.log('[DraggableDialogContent] Mount/Update:', {
        modalId: draggableConfig.id,
        draggable,
        hasConfig: !!draggableConfig,
        props: Object.keys(props)
      });
    }
  });

  // Extract focus handlers to prevent them from causing re-renders
  const { onOpenAutoFocus, onCloseAutoFocus, ...restProps } = props;

  // Early return for non-draggable dialogs to avoid any hook conflicts
  if (!draggable || !draggableConfig) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
          <DialogPrimitive.Content 
            ref={ref}
            className={cn(
              "relative grid w-full max-w-lg gap-4 rounded-lg p-6 shadow-lg glass pointer-events-auto",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              className
            )} 
            onOpenAutoFocus={onOpenAutoFocus}
            onCloseAutoFocus={onCloseAutoFocus}
            {...restProps}
          >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  }

  // For draggable dialogs, create a separate internal component to avoid ref conflicts
  return (
    <DialogPortal>
      <DialogOverlay />
      <DraggableDialogContentInternal 
        className={className}
        draggableConfig={draggableConfig}
        showMinimizeButton={showMinimizeButton}
        showCloseButton={showCloseButton}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
        {...restProps}
      >
        {children}
      </DraggableDialogContentInternal>
    </DialogPortal>
  );
});
DraggableDialogContent.displayName = "DraggableDialogContent";

// Internal component for draggable dialogs - completely independent from Radix Dialog system
const DraggableDialogContentInternal = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children: React.ReactNode;
    draggableConfig: ModalDragAndMinimizeConfig;
    showMinimizeButton?: boolean;
    showCloseButton?: boolean;
    onOpenAutoFocus?: (event: Event) => void;
    onCloseAutoFocus?: (event: Event) => void;
  } & React.ComponentPropsWithoutRef<'div'>
>(({ 
  className, 
  children, 
  draggableConfig,
  showMinimizeButton = true,
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props 
}, ref) => {
  // Use the drag hook directly without any memoization that could cause issues
  const {
    isMinimized,
    isDragging,
    minimize,
    containerProps,
    dragHandleProps,
  } = useModalDragAndMinimize(draggableConfig);

  // Use refs to store callbacks to prevent re-renders
  const onOpenAutoFocusRef = React.useRef(onOpenAutoFocus);
  const onCloseAutoFocusRef = React.useRef(onCloseAutoFocus);
  
  React.useLayoutEffect(() => {
    onOpenAutoFocusRef.current = onOpenAutoFocus;
    onCloseAutoFocusRef.current = onCloseAutoFocus;
  });

  // Handle focus events to prevent infinite loops
  React.useEffect(() => {
    if (!isMinimized && onOpenAutoFocusRef.current) {
      // Create a synthetic event to pass to the handler
      const event = new Event('focus');
      onOpenAutoFocusRef.current(event);
    }
  }, [isMinimized]); // Only depend on isMinimized

  React.useEffect(() => {
    return () => {
      if (onCloseAutoFocusRef.current) {
        const event = new Event('blur');
        onCloseAutoFocusRef.current(event);
      }
    };
  }, []); // Run only on unmount

  // Don't render if minimized
  if (isMinimized) {
    return null;
  }

  // Find the DialogClose component to trigger close
  const handleClose = React.useCallback(() => {
    // Find the Radix dialog close trigger and click it
    const closeButton = document.querySelector('[data-radix-dialog-close]');
    if (closeButton instanceof HTMLElement) {
      closeButton.click();
    } else {
      // Fallback: dispatch escape key event
      const escapeEvent = new KeyboardEvent('keydown', { 
        key: 'Escape',
        code: 'Escape',
        bubbles: true 
      });
      document.dispatchEvent(escapeEvent);
    }
  }, []);

  // Draggable dialog - completely independent, no Radix components at all
  return ReactDOM.createPortal(
    <>
      {/* Modal container - no backdrop, that's handled by DialogOverlay in parent */}
      <div 
        {...containerProps}
        className={cn(
          "glass rounded-lg shadow-xl overflow-hidden flex flex-col max-w-lg w-full",
          isDragging && "modal-dragging",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${draggableConfig.id}-title`}
        aria-describedby={`${draggableConfig.id}-drag-instructions`}
          {...props}
        >
          {/* Title bar with drag handle */}
          <div 
            {...dragHandleProps}
            className={cn(
              "modal-title-bar flex items-center justify-between p-4 border-b border-white/10",
              "cursor-move", // Make the entire title bar show move cursor
              dragHandleProps.className
            )}
            data-testid="modal-title-bar"
          >
            {/* Title */}
            <div className="pointer-events-none">
            <h3 id={`${draggableConfig.id}-title`} className="text-lg font-semibold m-0">
                {draggableConfig?.title || ''}
              </h3>
            </div>
            
            {/* Buttons - positioned with higher z-index and pointer-events */}
            <div className="flex items-center gap-2 ml-4 relative z-20">
              {showMinimizeButton && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering drag
                    minimize();
                  }}
                  className="modal-minimize-btn pointer-events-auto"
                  aria-label="Minimize modal"
                  title="Minimize"
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
            <button
                className="modal-minimize-btn pointer-events-auto"
                aria-label="Close modal"
                title="Close"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering drag
                  handleClose();
                }}
              >
                <X className="w-4 h-4" />
            </button>
            </div>
          </div>

        {/* Modal content - plain div, no Radix DialogPrimitive.Content */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>

          {/* Screen reader instructions */}
          <div id={`${draggableConfig.id}-drag-instructions`} className="sr-only">
            Drag the title bar to move this modal. Press Control+M to minimize or Escape to close.
          </div>
      </div>
    </>,
    document.body
  );
});

DraggableDialogContentInternal.displayName = 'DraggableDialogContentInternal';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DraggableDialogContent,
}
