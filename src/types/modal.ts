export interface ModalPosition {
  x: number;
  y: number;
}

export interface ModalDimensions {
  width: number;
  height: number;
}

export interface ViewportBounds {
  width: number;
  height: number;
}

export interface DragState {
  isDragging: boolean;
  dragOffset: ModalPosition;
  startPosition: ModalPosition;
  currentPosition: ModalPosition;
}

export interface ModalState {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  isMinimized: boolean;
  position: ModalPosition;
  dimensions?: ModalDimensions;
  zIndex: number;
  isVisible: boolean;
}

export interface MinimizedModalData {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  order: number; // For left-to-right ordering, most recent = 0
}

export interface ModalManagerState {
  modals: Record<string, ModalState>;
  minimizedModals: MinimizedModalData[];
  highestZIndex: number;
}

export interface DragHandlers {
  onDragStart: (event: React.MouseEvent<HTMLElement>) => void;
  onDragMove: (event: MouseEvent) => void;
  onDragEnd: (event: MouseEvent) => void;
}

export interface ModalDragAndMinimizeConfig {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  defaultPosition?: ModalPosition;
  constraints?: {
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
  };
  persistent?: boolean; // Whether to persist position across sessions
}

export interface UseModalDragAndMinimizeReturn {
  // Position and state
  position: ModalPosition;
  isMinimized: boolean;
  isDragging: boolean;
  zIndex: number;
  
  // Event handlers
  dragHandlers: DragHandlers;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  
  // Style props for the modal container
  style: React.CSSProperties;
  
  // Accessibility props
  dragProps: {
    role: string;
    'aria-grabbed': boolean;
    'aria-describedby': string;
    tabIndex: number;
  };
}

export interface ModalManagerContextType {
  // State
  state: ModalManagerState;
  
  // Registration
  registerModal: (config: ModalDragAndMinimizeConfig) => void;
  unregisterModal: (id: string) => void;
  
  // Actions
  minimizeModal: (id: string) => void;
  restoreModal: (id: string) => void;
  updateModalPosition: (id: string, position: ModalPosition) => void;
  bringToFront: (id: string) => void;
  
  // Getters
  getModalState: (id: string) => ModalState | undefined;
  getMinimizedModals: () => MinimizedModalData[];
} 