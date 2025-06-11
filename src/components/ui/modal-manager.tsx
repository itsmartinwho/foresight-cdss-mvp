'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { 
  ModalManagerState, 
  ModalManagerContextType, 
  ModalState,
  ModalDragAndMinimizeConfig,
  ModalPosition,
  MinimizedModalData
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
      // This action can be used to restore state from persistence if needed
      return state;
    }

    default:
      return state;
  }
}

// Create context
const ModalManagerContext = createContext<ModalManagerContextType | undefined>(undefined);

// Provider component
interface ModalManagerProviderProps {
  children: ReactNode;
}

export function ModalManagerProvider({ children }: ModalManagerProviderProps) {
  const [state, dispatch] = useReducer(modalManagerReducer, initialState);

  // Initialize from storage on mount
  useEffect(() => {
    const persistedData = loadModalPositions();
    if (persistedData) {
      dispatch({ type: 'INITIALIZE_FROM_STORAGE', payload: { persistedData } });
    }
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
  };

  return (
    <ModalManagerContext.Provider value={contextValue}>
      {children}
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