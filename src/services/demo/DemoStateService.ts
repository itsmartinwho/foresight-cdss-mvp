// Demo State Service - Handles demo state persistence and management
export type DemoStage = 
  | 'introModal' 
  | 'fabVisible' 
  | 'selectingPatient' 
  | 'navigatingToWorkspace' 
  | 'consultationPanelReady' 
  | 'animatingTranscript' 
  | 'simulatingPlanGeneration' 
  | 'showingPlan' 
  | 'finished';

export class DemoStateService {
  private static readonly DEMO_STORAGE_KEY = 'hasDemoRun_v3'; // Changed to reset demo for all users after animation fix
  
  static hasDemoRun(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.DEMO_STORAGE_KEY) === 'true';
  }

  static setDemoRun(hasRun: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.DEMO_STORAGE_KEY, String(hasRun));
    
    // Trigger storage event for cross-tab synchronization
    window.dispatchEvent(new StorageEvent('storage', {
      key: this.DEMO_STORAGE_KEY,
      newValue: String(hasRun),
      oldValue: localStorage.getItem(this.DEMO_STORAGE_KEY),
      storageArea: localStorage
    }));
  }

  static addStorageListener(callback: (hasRun: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === this.DEMO_STORAGE_KEY) {
        callback(event.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }

  static getInitialDemoStage(): DemoStage {
    return this.hasDemoRun() ? 'finished' : 'introModal';
  }

  static shouldShowDemoModal(): boolean {
    return !this.hasDemoRun();
  }

  static resetDemo(): void {
    if (typeof window === 'undefined') return;
    
    // Remove the localStorage item completely (more thorough than setDemoRun(false))
    localStorage.removeItem(this.DEMO_STORAGE_KEY);
    
    // Trigger storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: this.DEMO_STORAGE_KEY,
      newValue: null,
      oldValue: 'true',
      storageArea: localStorage
    }));
  }
} 