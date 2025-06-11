'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode, useRef } from 'react';
import { 
  ModalManagerState, 
  ModalState, 
  MinimizedModalData, 
  ModalDragAndMinimizeConfig, 
  ModalPosition,
  ModalManagerContextType
} from '@/types/modal';
import { 
  loadModalPositions, 
  saveModalPosition, 
  updateMinimizedOrder, 
  removeModalFromPersistence,
  getDefaultCenterPosition,
  constrainToViewport
} from '@/lib/modalPersistence';

// Action types for modal manager reducer
type ModalManagerAction =
  | { type: 'REGISTER_MODAL'; payload: { config: ModalDragAndMinimizeConfig } }
  | { type: 'UNREGISTER_MODAL'; payload: { id: string } }
  | { type: 'UPDATE_POSITION'; payload: { id: string; position: ModalPosition } }
  | { type: 'MINIMIZE_MODAL'; payload: { id: string } }
  | { type: 'RESTORE_MODAL'; payload: { id: string } }
  | { type: 'BRING_TO_FRONT'; payload: { id: string } }
  | { type: 'INITIALIZE_FROM_STORAGE'; payload: { persistedData: any } };

const initialState: ModalManagerState = {
  modals: {},
  minimizedModals: [],
  highestZIndex: 1000,
};

// Reducer for managing modal state
function modalManagerReducer(state: ModalManagerState, action: ModalManagerAction): ModalManagerState {
  switch (action.type) {
    case 'REGISTER_MODAL': {
      const { config } = action.payload;
      const { id, title, icon, defaultPosition } = config;

      // Check if modal already exists
      if (state.modals[id]) {
        return state;
      }

      // Get persisted data if available
      const persistedData = loadModalPositions();
      const modalPersistedData = persistedData?.modals[id];

      // Calculate position
      let position: ModalPosition;
      if (modalPersistedData && !modalPersistedData.isMinimized) {
        // Use persisted position, constrained to current viewport
        position = constrainToViewport(modalPersistedData.position);
      } else if (defaultPosition) {
        position = constrainToViewport(defaultPosition);
      } else {
        position = getDefaultCenterPosition();
      }

      const newZIndex = state.highestZIndex + 1;

      const modalState: ModalState = {
        id,
        title,
        icon,
        isMinimized: modalPersistedData?.isMinimized ?? false,
        position,
        zIndex: modalPersistedData?.zIndex ?? newZIndex,
        isVisible: true,
      };

      // Update minimized modals if this modal was minimized
      let minimizedModals = state.minimizedModals;
      if (modalState.isMinimized) {
        const existingIndex = minimizedModals.findIndex(m => m.id === id);
        if (existingIndex === -1) {
          const minimizedData: MinimizedModalData = {
            id,
            title,
            icon,
            order: 0, // Will be updated based on persisted order
          };
          minimizedModals = [minimizedData, ...minimizedModals];
        }
      }

      return {
        ...state,
        modals: {
          ...state.modals,
          [id]: modalState,
        },
        minimizedModals,
        highestZIndex: Math.max(newZIndex, state.highestZIndex),
      };
    }

    case 'UNREGISTER_MODAL': {
      const { id } = action.payload;
      const { [id]: removedModal, ...remainingModals } = state.modals;
      
      // Remove from persistence
      removeModalFromPersistence(id);

      return {
        ...state,
        modals: remainingModals,
        minimizedModals: state.minimizedModals.filter(m => m.id !== id),
      };
    }

    case 'UPDATE_POSITION': {
      const { id, position } = action.payload;
      const modal = state.modals[id];
      if (!modal) return state;

      const updatedModal = { ...modal, position };
      
      // Persist position
      saveModalPosition(id, position, modal.isMinimized, modal.zIndex);

      return {
        ...state,
        modals: {
          ...state.modals,
          [id]: updatedModal,
        },
      };
    }

    case 'MINIMIZE_MODAL': {
      const { id } = action.payload;
      const modal = state.modals[id];
      console.log('ModalManager: MINIMIZE_MODAL called for id:', id, 'modal:', modal);
      if (!modal || modal.isMinimized) return state;

      const updatedModal = { ...modal, isMinimized: true };
      
      // Update minimized modals list (most recent first)
      const existingMinimizedIndex = state.minimizedModals.findIndex(m => m.id === id);
      let minimizedModals = state.minimizedModals;

      if (existingMinimizedIndex >= 0) {
        // Move to front
        const [minimizedModal] = minimizedModals.splice(existingMinimizedIndex, 1);
        minimizedModals = [minimizedModal, ...minimizedModals];
      } else {
        // Add new minimized modal at front
        const minimizedData: MinimizedModalData = {
          id,
          title: modal.title,
          icon: modal.icon,
          order: 0,
        };
        minimizedModals = [minimizedData, ...minimizedModals];
      }

      // Update order values
      minimizedModals = minimizedModals.map((modal, index) => ({
        ...modal,
        order: index,
      }));

      console.log('ModalManager: After minimize, minimizedModals:', minimizedModals);

      // Persist minimized state
      updateMinimizedOrder(id, true);
      saveModalPosition(id, modal.position, true, modal.zIndex);

      return {
        ...state,
        modals: {
          ...state.modals,
          [id]: updatedModal,
        },
        minimizedModals,
      };
    }

    case 'RESTORE_MODAL': {
      const { id } = action.payload;
      const modal = state.modals[id];
      if (!modal || !modal.isMinimized) return state;

      const newZIndex = state.highestZIndex + 1;
      const updatedModal = { 
        ...modal, 
        isMinimized: false,
        zIndex: newZIndex,
      };

      // Remove from minimized modals
      const minimizedModals = state.minimizedModals
        .filter(m => m.id !== id)
        .map((modal, index) => ({ ...modal, order: index }));

      // Persist restored state
      updateMinimizedOrder(id, false);
      saveModalPosition(id, modal.position, false, newZIndex);

      return {
        ...state,
        modals: {
          ...state.modals,
          [id]: updatedModal,
        },
        minimizedModals,
        highestZIndex: newZIndex,
      };
    }

    case 'BRING_TO_FRONT': {
      const { id } = action.payload;
      const modal = state.modals[id];
      if (!modal || modal.isMinimized) return state;

      const newZIndex = state.highestZIndex + 1;
      const updatedModal = { ...modal, zIndex: newZIndex };

      // Persist z-index
      saveModalPosition(id, modal.position, modal.isMinimized, newZIndex);

      return {
        ...state,
        modals: {
          ...state.modals,
          [id]: updatedModal,
        },
        highestZIndex: newZIndex,
      };
    }

    case 'INITIALIZE_FROM_STORAGE': {
      const { persistedData } = action.payload;
      const modals: { [id: string]: ModalState } = {};
      let highestZIndex = state.highestZIndex;

      for (const modalId in persistedData.modals) {
        const pModal = persistedData.modals[modalId];
        modals[modalId] = {
          ...pModal,
          isVisible: true,
        };
        if (pModal.zIndex > highestZIndex) {
          highestZIndex = pModal.zIndex;
        }
      }

      const minimizedModals = (persistedData.minimizedOrder || [])
        .map((id: string, index: number) => {
          const modal = persistedData.modals[id];
          if (modal) {
            return {
              id,
              title: modal.title || 'Untitled',
              icon: modal.icon,
              order: index,
            };
          }
          return null;
        })
        .filter(Boolean) as MinimizedModalData[];

      return {
        modals,
        minimizedModals,
        highestZIndex,
      };
    }

    default:
      return state;
  }
}

type Listener = () => void;

// Create context
const ModalManagerContext = createContext<ModalManagerContextType | undefined>(undefined);

// Provider component
interface ModalManagerProviderProps {
  children: ReactNode;
}

export function ModalManagerProvider({ children }: ModalManagerProviderProps) {
  const [state, dispatch] = useReducer(modalManagerReducer, initialState);
  const listeners = useRef<Listener[]>([]);

  // Notify listeners on state change
  useEffect(() => {
    for (const listener of listeners.current) {
      listener();
    }
  }, [state]);

  // Initialize from storage on mount
  useEffect(() => {
    const persistedData = loadModalPositions();
    if (persistedData) {
      dispatch({ type: 'INITIALIZE_FROM_STORAGE', payload: { persistedData } });
    }
  }, []);

  // Determine if overlay should be shown
  const shouldShowOverlay = React.useMemo(() => {
    const visibleNonMinimizedModals = Object.values(state.modals).filter(modal => modal.isVisible && !modal.isMinimized);
    const result = visibleNonMinimizedModals.length > 0;
    console.log('ModalManager: shouldShowOverlay calculation:');
    console.log('  - All modals:', Object.keys(state.modals));
    console.log('  - Visible non-minimized modals:', visibleNonMinimizedModals.map(m => ({ id: m.id, isVisible: m.isVisible, isMinimized: m.isMinimized })));
    console.log('  - shouldShowOverlay result:', result);
    return result;
  }, [state.modals]);

  // Get the highest z-index for overlay positioning
  const overlayZIndex = React.useMemo(() => {
    const visibleModals = Object.values(state.modals).filter(modal => modal.isVisible && !modal.isMinimized);
    if (visibleModals.length === 0) return 0;
    const highestModalZIndex = Math.max(...visibleModals.map(modal => modal.zIndex));
    return highestModalZIndex - 1; // Overlay should be below the modals
  }, [state.modals]);

  // Handle scroll locking when overlay is shown
  useEffect(() => {
    if (shouldShowOverlay) {
      document.documentElement.classList.add('overflow-hidden');
      return () => {
        document.documentElement.classList.remove('overflow-hidden');
      };
    } else {
      document.documentElement.classList.remove('overflow-hidden');
    }
  }, [shouldShowOverlay]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.push(listener);
    return () => {
      listeners.current = listeners.current.filter(l => l !== listener);
    };
  }, []);

  // Modal registration and management functions
  const registerModal = useCallback((config: ModalDragAndMinimizeConfig) => {
    dispatch({ type: 'REGISTER_MODAL', payload: { config } });
  }, []);

  const unregisterModal = useCallback((id: string) => {
    dispatch({ type: 'UNREGISTER_MODAL', payload: { id } });
  }, []);

  const updateModalPosition = useCallback((id: string, position: ModalPosition) => {
    dispatch({ type: 'UPDATE_POSITION', payload: { id, position } });
  }, []);

  const minimizeModal = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE_MODAL', payload: { id } });
  }, []);

  const restoreModal = useCallback((id: string) => {
    dispatch({ type: 'RESTORE_MODAL', payload: { id } });
  }, []);

  const bringToFront = useCallback((id: string) => {
    dispatch({ type: 'BRING_TO_FRONT', payload: { id } });
  }, []);

  // Getter functions
  const getModalState = useCallback((id: string): ModalState | undefined => {
    return state.modals[id];
  }, [state.modals]);

  const getMinimizedModals = useCallback((): MinimizedModalData[] => {
    return state.minimizedModals;
  }, [state.minimizedModals]);

  const contextValue: ModalManagerContextType = {
    state,
    registerModal,
    unregisterModal,
    minimizeModal,
    restoreModal,
    updateModalPosition,
    bringToFront,
    getModalState,
    getMinimizedModals,
    subscribe,
  };

  return (
    <ModalManagerContext.Provider value={contextValue}>
      {children}
      {/* Global modal overlay - only shown when there are visible, non-minimized modals */}
      {shouldShowOverlay && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: overlayZIndex }}
          aria-hidden="true"
        />
      )}
    </ModalManagerContext.Provider>
  );
}

// Hook to use modal manager context
export function useModalManager(): ModalManagerContextType {
  const context = useContext(ModalManagerContext);
  if (context === undefined) {
    throw new Error('useModalManager must be used within a ModalManagerProvider');
  }
  return context;
} 