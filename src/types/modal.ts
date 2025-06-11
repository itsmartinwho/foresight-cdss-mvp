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

export interface ModalManagerContextType {
  state: ModalManagerState;
  registerModal: (config: ModalDragAndMinimizeConfig) => void;
  unregisterModal: (id: string) => void;
  minimizeModal: (id: string) => void;
  restoreModal: (id: string) => void;
  updateModalPosition: (id: string, position: ModalPosition) => void;
  bringToFront: (id:string) => void;
  getModalState: (id: string) => ModalState | undefined;
  getMinimizedModals: () => MinimizedModalData[];
  subscribe: (listener: () => void) => () => void;
}

/**
 * Return type for the useModalDragAndMinimize hook
 */
export interface UseModalDragAndMinimizeReturn {
  isMinimized: boolean;
  isDragging: boolean;
  minimize: () => void;
  restore: () => void;
  close: () => void;
  containerProps: {
    style: React.CSSProperties;
    className?: string;
    role: "dialog";
    "aria-modal": true;
    "aria-hidden": boolean;
    "aria-labelledby": string;
    "aria-describedby": string;
  };
  dragHandleProps: {
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
    style: React.CSSProperties;
    className?: string;
  };
} 