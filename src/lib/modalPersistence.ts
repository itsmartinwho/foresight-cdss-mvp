import { ModalPosition, ModalState } from '@/types/modal';

const STORAGE_KEY = 'foresight-modal-positions';
const STORAGE_VERSION = '1.0'; // For future migration compatibility

interface PersistedModalData {
  position: ModalPosition;
  zIndex: number;
  isMinimized: boolean;
  timestamp: number;
}

interface ModalPositionStorage {
  version: string;
  modals: Record<string, PersistedModalData>;
  minimizedOrder: string[]; // Array of modal IDs in order
}

// Session timeout in milliseconds (1 hour)
const SESSION_TIMEOUT = 60 * 60 * 1000;

/**
 * Loads modal positions from sessionStorage
 */
export function loadModalPositions(): ModalPositionStorage | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: ModalPositionStorage = JSON.parse(stored);
    
    // Version check for future compatibility
    if (data.version !== STORAGE_VERSION) {
      console.warn('Modal position storage version mismatch, clearing data');
      clearModalPositions();
      return null;
    }

    // Clean up expired entries
    const now = Date.now();
    const validModals: Record<string, PersistedModalData> = {};
    
    Object.entries(data.modals).forEach(([id, modalData]) => {
      if (now - modalData.timestamp < SESSION_TIMEOUT) {
        validModals[id] = modalData;
      }
    });

    // Filter minimized order to only include valid modals
    const validMinimizedOrder = data.minimizedOrder.filter(id => validModals[id]);

    const cleanedData: ModalPositionStorage = {
      version: data.version,
      modals: validModals,
      minimizedOrder: validMinimizedOrder,
    };

    // Update storage with cleaned data
    if (Object.keys(validModals).length !== Object.keys(data.modals).length) {
      saveModalPositions(cleanedData);
    }

    return cleanedData;
  } catch (error) {
    console.error('Failed to load modal positions:', error);
    clearModalPositions();
    return null;
  }
}

/**
 * Saves modal positions to sessionStorage
 */
export function saveModalPositions(data: ModalPositionStorage): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save modal positions:', error);
    // Handle quota exceeded or other storage errors
    if (error instanceof DOMException && error.code === 22) {
      console.warn('SessionStorage quota exceeded, clearing old data');
      clearModalPositions();
    }
  }
}

/**
 * Saves a single modal's position and state
 */
export function saveModalPosition(
  modalId: string, 
  position: ModalPosition, 
  isMinimized: boolean = false,
  zIndex: number = 1000
): void {
  const currentData = loadModalPositions() || {
    version: STORAGE_VERSION,
    modals: {},
    minimizedOrder: [],
  };

  currentData.modals[modalId] = {
    position,
    zIndex,
    isMinimized,
    timestamp: Date.now(),
  };

  saveModalPositions(currentData);
}

/**
 * Updates the minimized order for a modal
 */
export function updateMinimizedOrder(modalId: string, isMinimized: boolean): void {
  const currentData = loadModalPositions() || {
    version: STORAGE_VERSION,
    modals: {},
    minimizedOrder: [],
  };

  if (isMinimized) {
    // Remove from current position and add to front
    currentData.minimizedOrder = [
      modalId,
      ...currentData.minimizedOrder.filter(id => id !== modalId)
    ];
  } else {
    // Remove from minimized order
    currentData.minimizedOrder = currentData.minimizedOrder.filter(id => id !== modalId);
  }

  saveModalPositions(currentData);
}

/**
 * Gets a specific modal's persisted data
 */
export function getModalPersistedData(modalId: string): PersistedModalData | null {
  const data = loadModalPositions();
  return data?.modals[modalId] || null;
}

/**
 * Removes a modal from persistence
 */
export function removeModalFromPersistence(modalId: string): void {
  const currentData = loadModalPositions();
  if (!currentData) return;

  delete currentData.modals[modalId];
  currentData.minimizedOrder = currentData.minimizedOrder.filter(id => id !== modalId);

  saveModalPositions(currentData);
}

/**
 * Clears all modal position data
 */
export function clearModalPositions(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear modal positions:', error);
  }
}

/**
 * Gets the default center position for a modal
 */
export function getDefaultCenterPosition(modalWidth = 600, modalHeight = 400): ModalPosition {
  const viewport = {
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  };

  return {
    x: Math.max(0, (viewport.width - modalWidth) / 2),
    y: Math.max(60, (viewport.height - modalHeight) / 2), // 60px top margin for header
  };
}

/**
 * Constrains a position to viewport bounds
 */
export function constrainToViewport(
  position: ModalPosition, 
  modalWidth = 600, 
  modalHeight = 400,
  headerHeight = 60
): ModalPosition {
  const viewport = {
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  };

  return {
    x: Math.max(0, Math.min(viewport.width - modalWidth, position.x)),
    y: Math.max(headerHeight, Math.min(viewport.height - headerHeight, position.y)),
  };
}

/**
 * Generates a unique modal ID if one isn't provided
 */
export function generateModalId(prefix = 'modal'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
} 