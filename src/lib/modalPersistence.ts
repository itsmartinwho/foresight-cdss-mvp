import { ModalPosition, ModalState } from '@/types/modal';

const STORAGE_KEY = 'foresight-modal-positions';
const STORAGE_VERSION = '1.0'; // For future migration compatibility

interface PersistedModalData {
  position: ModalPosition;
  zIndex: number;
  isMinimized: boolean;
  timestamp: number;
  title?: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  originUrl?: string; // Track where the modal was originally opened
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
  zIndex: number = 1000,
  title?: string,
  icon?: React.ComponentType<{ className?: string }> | string,
  originUrl?: string
): void {
  const currentData = loadModalPositions() || {
    version: STORAGE_VERSION,
    modals: {},
    minimizedOrder: [],
  };

  // Preserve existing originUrl if not provided and modal already exists
  const existingModal = currentData.modals[modalId];
  const finalOriginUrl = originUrl || existingModal?.originUrl;

  currentData.modals[modalId] = {
    position,
    zIndex,
    isMinimized,
    timestamp: Date.now(),
    title,
    icon,
    originUrl: finalOriginUrl,
  };

  saveModalPositions(currentData);
}

/**
 * Updates the minimized order for a modal
 */
export function updateMinimizedOrder(modalId: string, isMinimized: boolean): void {
  const data = loadModalPositions();
  if (!data) return;

  if (isMinimized && !data.minimizedOrder.includes(modalId)) {
    // Add to minimized order at the front
    data.minimizedOrder = [modalId, ...data.minimizedOrder];
  } else if (!isMinimized && data.minimizedOrder.includes(modalId)) {
    // Remove from minimized order
    data.minimizedOrder = data.minimizedOrder.filter((id) => id !== modalId);
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
export function getDefaultCenterPosition(modalWidth = 800, modalHeight = 600): ModalPosition {
  if (typeof window === 'undefined') {
    return { x: 200, y: 100 }; // SSR fallback
  }

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Account for common UI elements
  const headerHeight = 80; // Space for header/navigation
  const bottomPadding = 40; // Bottom padding
  const sidePadding = 40; // Side padding

  // Calculate available space
  const availableWidth = viewport.width - (sidePadding * 2);
  const availableHeight = viewport.height - headerHeight - bottomPadding;

  // Adjust modal size if it's too large for viewport
  const effectiveModalWidth = Math.min(modalWidth, availableWidth);
  const effectiveModalHeight = Math.min(modalHeight, availableHeight);

  return {
    x: sidePadding + Math.max(0, (availableWidth - effectiveModalWidth) / 2),
    y: headerHeight + Math.max(0, (availableHeight - effectiveModalHeight) / 2),
  };
}

/**
 * Constrains a position to viewport bounds
 */
export function constrainToViewport(
  position: ModalPosition, 
  modalWidth = 800, 
  modalHeight = 600
): ModalPosition {
  if (typeof window === 'undefined') {
    return position; // SSR fallback
  }

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // UI element constraints - be more lenient with vertical space
  const minTopPadding = 20; // Minimum space from top
  const minBottomPadding = 20; // Minimum space from bottom  
  const sidePadding = 20;
  const minVisibleWidth = 200; // Ensure at least this much is visible

  // Calculate max positions based on actual modal dimensions
  const maxX = Math.max(sidePadding, viewport.width - minVisibleWidth);
  const maxY = Math.max(minTopPadding, viewport.height - modalHeight - minBottomPadding);

  return {
    x: Math.max(sidePadding, Math.min(maxX, position.x)),
    y: Math.max(minTopPadding, Math.min(maxY, position.y)),
  };
}

/**
 * Generates a unique modal ID if one isn't provided
 */
export function generateModalId(prefix = 'modal'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Clear all stored modals - useful for debugging and fixing stuck modals
export const clearAllStoredModals = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
    console.log('✅ All stored modals cleared from sessionStorage');
  }
}; 