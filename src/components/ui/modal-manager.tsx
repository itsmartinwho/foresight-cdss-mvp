'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  | { type: 'REGISTER_MODAL'; payload: { config: ModalDragAndMinimizeConfig; originUrl?: string } }
  | { type: 'UNREGISTER_MODAL'; payload: { id: string } }
  | { type: 'UPDATE_POSITION'; payload: { id: string; position: ModalPosition } }
  | { type: 'MINIMIZE_MODAL'; payload: { id: string } }
  | { type: 'RESTORE_MODAL'; payload: { id: string } }
  | { type: 'BRING_TO_FRONT'; payload: { id: string } }
  | { type: 'INITIALIZE_FROM_STORAGE'; payload: { persistedData: any } }
  | { type: 'CLEAN_ORPHANED_MODALS' }
  | { type: 'SET_MODAL_VISIBILITY'; payload: { id: string; isVisible: boolean } };

const initialState: ModalManagerState = {
  modals: {},
  minimizedModals: [],
  highestZIndex: 1000,
};

// Reducer for managing modal state
function modalManagerReducer(state: ModalManagerState, action: ModalManagerAction): ModalManagerState {
  switch (action.type) {
    case 'REGISTER_MODAL': {
      const { config, originUrl } = action.payload;
      const { id, title, icon, defaultPosition } = config;

      // Check if modal already exists and is visible - if so, just update its visibility
      if (state.modals[id] && state.modals[id].isVisible) {
        return state;
      }

      // If modal exists but isn't visible, update it to be visible
      if (state.modals[id]) {
        const existingModal = state.modals[id];
        
        // If the modal was restored while component wasn't mounted, 
        // it will have isMinimized: false but isVisible: false
        // In this case, we should show it restored, not minimized
        const shouldShowRestored = !existingModal.isMinimized && !existingModal.isVisible;
        
        return {
          ...state,
          modals: {
            ...state.modals,
            [id]: {
              ...existingModal,
              isVisible: true,
            }
          },
          // If we're showing a restored modal, ensure it's not in minimized list
          minimizedModals: shouldShowRestored 
            ? state.minimizedModals.filter(m => m.id !== id)
            : state.minimizedModals
        };
      }

      // Get persisted data if available
      const persistedData = loadModalPositions();
      const modalPersistedData = persistedData?.modals[id];

      // Calculate position
      let position: ModalPosition;
      if (modalPersistedData && !modalPersistedData.isMinimized) {
        // Use persisted position, constrained to current viewport
        // Use different dimensions based on modal type
        const modalWidth = id.includes('demo') ? 750 : 512;
        const modalHeight = id.includes('demo') ? 650 : 
                           (id.includes('new-consultation') || id.includes('consultation')) ? 400 : 500;
        position = constrainToViewport(modalPersistedData.position, modalWidth, modalHeight);
      } else if (defaultPosition) {
        // Use different dimensions based on modal type  
        const modalWidth = id.includes('demo') ? 750 : 512;
        const modalHeight = id.includes('demo') ? 650 : 
                           (id.includes('new-consultation') || id.includes('consultation')) ? 400 : 500;
        position = constrainToViewport(defaultPosition, modalWidth, modalHeight);
      } else {
        // No specific position provided, use centered position
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
        isVisible: true, // Always mark as visible when actively registering
      };

      // Save the modal position with origin URL for navigation purposes
      saveModalPosition(id, position, modalState.isMinimized, modalState.zIndex, title, icon, originUrl);

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
      const modalToRemove = state.modals[id];
      
      // If modal is minimized, don't remove it completely - just mark as not visible
      // This allows minimized modals to persist across page navigation
      if (modalToRemove && modalToRemove.isMinimized) {
        return {
          ...state,
          modals: {
            ...state.modals,
            [id]: {
              ...modalToRemove,
              isVisible: false,
            }
          }
          // Keep minimized modal in the list
        };
      }
      
      // If modal is not minimized, remove it completely
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
      
      // Persist position (preserve existing originUrl)
      const existingPersistedData = loadModalPositions()?.modals[id];
      saveModalPosition(id, position, modal.isMinimized, modal.zIndex, modal.title, modal.icon, existingPersistedData?.originUrl);

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

      // Persist minimized state (preserve existing originUrl)
      updateMinimizedOrder(id, true);
      const existingPersistedData = loadModalPositions()?.modals[id];
      saveModalPosition(id, modal.position, true, modal.zIndex, modal.title, modal.icon, existingPersistedData?.originUrl);

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

      // Check if modal component is currently mounted (isVisible indicates an active component)
      // If not mounted, we'll mark it as pending restore and it will restore when component mounts
      const updatedModal = { 
        ...modal, 
        isMinimized: false,
        zIndex: newZIndex,
        // Keep isVisible as-is - if component isn't mounted, it stays false
        // When component mounts and registers, it will see isMinimized: false and show itself
      };

      // Remove from minimized modals
      const minimizedModals = state.minimizedModals
        .filter(m => m.id !== id)
        .map((modal, index) => ({ ...modal, order: index }));

      // Persist restored state (preserve existing originUrl)
      updateMinimizedOrder(id, false);
      const existingPersistedData = loadModalPositions()?.modals[id];
      saveModalPosition(id, modal.position, false, newZIndex, modal.title, modal.icon, existingPersistedData?.originUrl);

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
      if (!state.modals[id]) return state;
      
      const newZIndex = state.highestZIndex + 1;
      return {
        ...state,
        modals: {
          ...state.modals,
          [id]: {
            ...state.modals[id],
            zIndex: newZIndex,
          },
        },
        highestZIndex: newZIndex,
      };
    }

    case 'CLEAN_ORPHANED_MODALS': {
      // Remove any minimized modals that don't have corresponding modal entries
      const validMinimizedModals = state.minimizedModals.filter(minimizedModal => state.modals[minimizedModal.id]);
      if (validMinimizedModals.length === state.minimizedModals.length) {
        return state; // No changes needed
      }
      return {
        ...state,
        minimizedModals: validMinimizedModals,
      };
    }

    case 'INITIALIZE_FROM_STORAGE': {
      const { persistedData } = action.payload;
      const modals: { [id: string]: ModalState } = {};
      let highestZIndex = state.highestZIndex;

      console.log('🔍 INITIALIZE_FROM_STORAGE Debug:', persistedData);

      for (const modalId in persistedData.modals) {
        const pModal = persistedData.modals[modalId];
        console.log('🔍 Loading modal from storage:', modalId, pModal);
        modals[modalId] = {
          ...pModal,
          isVisible: false, // Don't automatically make persisted modals visible
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
              title: modal.title || '',
              icon: modal.icon,
              order: index,
            };
          }
          return null;
        })
        .filter(Boolean) as MinimizedModalData[];

      console.log('🔍 Initialized modals from storage:', Object.keys(modals));
      console.log('🔍 Initialized minimized modals:', minimizedModals);

      return {
        modals,
        minimizedModals,
        highestZIndex,
      };
    }

    case 'SET_MODAL_VISIBILITY': {
      const { id, isVisible } = action.payload;
      const modal = state.modals[id];
      if (!modal) return state;

      const updatedModal = { ...modal, isVisible };
      
             // Persist visibility (preserve existing originUrl)
       const existingPersistedData = loadModalPositions()?.modals[id];
       saveModalPosition(id, modal.position, modal.isMinimized, modal.zIndex, modal.title, modal.icon, existingPersistedData?.originUrl);

      return {
        ...state,
        modals: {
          ...state.modals,
          [id]: updatedModal,
        },
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
  const router = useRouter();
  const pathname = usePathname();
  const listeners = useRef<Listener[]>([]);
  const isInitialized = useRef(false);

  // Notify listeners on state change
  useEffect(() => {
    for (const listener of listeners.current) {
      listener();
    }
  }, [state]);

  // Initialize from storage on mount - only run once
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    const persistedData = loadModalPositions();
    if (persistedData) {
      dispatch({ type: 'INITIALIZE_FROM_STORAGE', payload: { persistedData } });
    }
  }, []);

  // Determine if overlay should be shown
  const shouldShowOverlay = React.useMemo(() => {
    const allModals = Object.values(state.modals);
    const visibleNonMinimizedModals = allModals.filter(modal => modal.isVisible && !modal.isMinimized);
    const result = visibleNonMinimizedModals.length > 0;
    
    // Only log debug info if there's a potential issue (overlay showing when no visible modals)
    if (result && visibleNonMinimizedModals.length === 0) {
      console.log('🔍 Overlay Issue Debug:');
      console.log('  Total modals:', allModals.length);
      console.log('  All modal details:', allModals.map(m => ({ 
        id: m.id, 
        title: m.title, 
        isVisible: m.isVisible, 
        isMinimized: m.isMinimized 
      })));
      console.log('  shouldShowOverlay result:', result);
    }
    
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
  const registerModal = useCallback((config: ModalDragAndMinimizeConfig, originUrl?: string) => {
    dispatch({ type: 'REGISTER_MODAL', payload: { config, originUrl } });
  }, []);

  const unregisterModal = useCallback((id: string) => {
    dispatch({ type: 'UNREGISTER_MODAL', payload: { id } });
  }, []);

  const updateModalPosition = useCallback((id: string, position: ModalPosition) => {
    dispatch({ type: 'UPDATE_POSITION', payload: { id, position } });
  }, []);

  // Getter functions - declared early to avoid scope issues
  const getModalState = useCallback((id: string): ModalState | undefined => {
    return state.modals[id];
  }, [state.modals]);

  const getMinimizedModals = useCallback((): MinimizedModalData[] => {
    return state.minimizedModals;
  }, [state.minimizedModals]);

  const minimizeModal = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE_MODAL', payload: { id } });
  }, []);

  const restoreModal = useCallback((id: string) => {
    const currentModal = state.modals[id];
    if (!currentModal) return;

    // Check if we need to navigate before restoring
    const persistedData = loadModalPositions();
    const modalData = persistedData?.modals[id];
    
    if (modalData?.originUrl && modalData.originUrl !== pathname) {
      // First, mark the modal for restoration after navigation
      // This ensures it will be restored when the component mounts on the target page
      dispatch({ type: 'RESTORE_MODAL', payload: { id } });
      
      // Then navigate to origin URL
      console.log(`🔗 Navigating to origin URL for modal ${id}: ${modalData.originUrl}`);
      router.push(modalData.originUrl);
      return;
    }

    // We're already on the correct page, restore the modal immediately
    dispatch({ type: 'RESTORE_MODAL', payload: { id } });

    // For immediate restoration on the same page, check if modal becomes visible
    setTimeout(() => {
      // Access modal state directly to avoid circular dependency with getModalState
      const updatedModal = state.modals[id];
      console.log(`🔍 Immediate restore check for modal ${id}:`, {
        exists: !!updatedModal,
        isMinimized: updatedModal?.isMinimized,
        isVisible: updatedModal?.isVisible
      });

      if (updatedModal && !updatedModal.isMinimized && !updatedModal.isVisible) {
        console.warn(`⚠️ Modal ${id} component not mounted for immediate restoration. This indicates the component may not be available on this page.`);
      }
    }, 100);
  }, [state.modals, pathname, router]);

  const bringToFront = useCallback((id: string) => {
    dispatch({ type: 'BRING_TO_FRONT', payload: { id } });
  }, []);

  const setModalVisibility = useCallback((id: string, isVisible: boolean) => {
    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { id, isVisible } });
  }, []);

  // Memoize the context value to prevent infinite re-renders
  const contextValue = useMemo(() => ({
    state,
    registerModal,
    unregisterModal,
    minimizeModal,
    restoreModal,
    updateModalPosition,
    bringToFront,
    setModalVisibility,
    getModalState,
    getMinimizedModals,
    subscribe,
  }), [
    state,
    registerModal,
    unregisterModal,
    minimizeModal,
    restoreModal,
    updateModalPosition,
    bringToFront,
    setModalVisibility,
    getModalState,
    getMinimizedModals,
    subscribe,
  ]);

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