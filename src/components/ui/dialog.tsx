"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Minus } from '@phosphor-icons/react';

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
  React.useEffect(() => {
    // lock scroll
    document.documentElement.classList.add('overflow-hidden');
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, []);

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
  // Always call the hook but only pass config when needed
  const {
    containerProps,
    dragHandleProps,
    minimize,
    close,
    isMinimized,
  } = useModalDragAndMinimize(
    draggable && draggableConfig ? draggableConfig : null
  );

  if (!draggable || !draggableConfig) {
    // Return regular dialog when not draggable
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
    );
  }

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

  // For draggable dialogs, use our wrapper but preserve dialog styling
  return (
    <DialogPortal>
      <DialogOverlay />
      <div 
        ref={ref as React.Ref<HTMLDivElement>}
        {...containerProps}
        className={cn(
          // Preserve original dialog styling
          "relative grid w-full max-w-lg gap-4 rounded-lg p-6 shadow-lg glass pointer-events-auto",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          // Add our drag class
          containerProps.className,
          className
        )}
        style={{
          ...containerProps.style,
          // Override center positioning only when draggable
        }}
      >
        {/* Custom draggable header */}
        <div 
          {...dragHandleProps} 
          className={cn(
            "flex items-center justify-between p-0 pb-4 -m-6 mb-2 px-6 pt-6",
            "border-b border-white/10",
            dragHandleProps.className
          )}
        >
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            {draggableConfig.title}
          </DialogTitle>
          <div className="flex items-center gap-1">
            {showMinimizeButton && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  minimize();
                }} 
                className="modal-minimize-btn"
                aria-label={`Minimize ${draggableConfig.title}`}
                title={`Minimize ${draggableConfig.title} (Ctrl+M)`}
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
            {showCloseButton && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }} 
                className="modal-minimize-btn hover:bg-red-500/20 hover:text-red-400"
                aria-label={`Close ${draggableConfig.title}`}
                title={`Close ${draggableConfig.title}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Dialog content */}
        <div className="grid gap-4">
          {children}
        </div>
      </div>
    </DialogPortal>
  );
});
DraggableDialogContent.displayName = "DraggableDialogContent";

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
