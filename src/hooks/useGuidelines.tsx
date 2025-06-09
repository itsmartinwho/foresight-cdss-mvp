import { useState, useEffect, useCallback, useMemo } from 'react';
import { GuidelineUIService } from '@/services/guidelines/guidelineUIService';
import { 
  GuidelineCard,
  GuidelineModalData,
  GuidelineFilter,
  SpecialtyCategory,
  SourceTheme,
  GuidelineUIState,
  Specialty,
  GuidelineSource
} from '@/types/guidelines';

interface UseGuidelinesProps {
  initialFilter?: Partial<GuidelineFilter>;
  autoLoad?: boolean;
  limit?: number;
}

interface UseGuidelinesReturn {
  // State
  guidelines: GuidelineCard[];
  specialtyCategories: SpecialtyCategory[];
  sourceThemes: SourceTheme[];
  availableSources: GuidelineSource[];
  guidelineCountsBySource: Record<GuidelineSource, number>;
  uiState: GuidelineUIState;
  
  // Loading states
  isLoading: boolean;
  isLoadingCategories: boolean;
  error: string | null;
  
  // Actions
  loadGuidelines: () => Promise<void>;
  searchGuidelines: (query: string) => Promise<void>;
  filterGuidelines: (filter: Partial<GuidelineFilter>) => void;
  setCurrentView: (view: 'grid' | 'list' | 'comparison') => void;
  selectGuideline: (id: number) => void;
  deselectGuideline: (id: number) => void;
  clearSelection: () => void;
  
  // Modal actions
  openGuidelineModal: (id: number) => Promise<void>;
  closeGuidelineModal: () => void;
  
  // Utility functions
  getGuidelineById: (id: number) => GuidelineCard | undefined;
  getSelectedGuidelines: () => GuidelineCard[];
  getSourceTheme: (source: GuidelineSource) => SourceTheme | undefined;
  getCategoryBySpecialty: (specialty: Specialty) => SpecialtyCategory | undefined;
}

export function useGuidelines({
  initialFilter = {},
  autoLoad = false,
  limit = 20
}: UseGuidelinesProps = {}): UseGuidelinesReturn {
  
  // Initialize service
  const uiService = useMemo(() => new GuidelineUIService(), []);
  
  // State
  const [guidelines, setGuidelines] = useState<GuidelineCard[]>([]);
  const [specialtyCategories, setSpecialtyCategories] = useState<SpecialtyCategory[]>([]);
  const [sourceThemes, setSourceThemes] = useState<SourceTheme[]>([]);
  const [availableSources, setAvailableSources] = useState<GuidelineSource[]>([]);
  const [guidelineCountsBySource, setGuidelineCountsBySource] = useState<Record<GuidelineSource, number>>({} as Record<GuidelineSource, number>);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [uiState, setUIState] = useState<GuidelineUIState>({
    currentView: 'grid',
    selectedGuidelines: [],
    activeModal: null,
    filter: {
      sources: [],
      specialties: [],
      searchQuery: '',
      sortBy: 'relevance',
      showBookmarksOnly: false,
      ...initialFilter
    },
    isLoading: false,
    error: null
  });

  // Load guidelines based on current filter
  const loadGuidelines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setUIState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const filteredGuidelines = await uiService.getFilteredGuidelines(uiState.filter, limit);
      setGuidelines(filteredGuidelines);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load guidelines';
      setError(errorMessage);
      setUIState(prev => ({ ...prev, error: errorMessage }));
      console.error('Error loading guidelines:', err);
    } finally {
      setIsLoading(false);
      setUIState(prev => ({ ...prev, isLoading: false }));
    }
  }, [uiService, uiState.filter, limit]);

  // Search guidelines
  const searchGuidelines = useCallback(async (query: string) => {
    setUIState(prev => ({
      ...prev,
      filter: { ...prev.filter, searchQuery: query }
    }));
  }, []);

  // Update filter
  const filterGuidelines = useCallback((newFilter: Partial<GuidelineFilter>) => {
    setUIState(prev => ({
      ...prev,
      filter: { ...prev.filter, ...newFilter }
    }));
  }, []);

  // Set current view
  const setCurrentView = useCallback((view: 'grid' | 'list' | 'comparison') => {
    setUIState(prev => ({ ...prev, currentView: view }));
  }, []);

  // Selection management
  const selectGuideline = useCallback((id: number) => {
    setUIState(prev => ({
      ...prev,
      selectedGuidelines: prev.selectedGuidelines.includes(id) 
        ? prev.selectedGuidelines 
        : [...prev.selectedGuidelines, id]
    }));
  }, []);

  const deselectGuideline = useCallback((id: number) => {
    setUIState(prev => ({
      ...prev,
      selectedGuidelines: prev.selectedGuidelines.filter(gId => gId !== id)
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setUIState(prev => ({ ...prev, selectedGuidelines: [] }));
  }, []);

  // Modal management
  const openGuidelineModal = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const modalData = await uiService.getGuidelineModalData(id);
      if (modalData) {
        setUIState(prev => ({ ...prev, activeModal: modalData }));
        
        // Track view (placeholder for analytics)
        await uiService.trackGuidelineView(id, 'current-user');
      } else {
        setError('Failed to load guideline details');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open guideline';
      setError(errorMessage);
      console.error('Error opening guideline modal:', err);
    } finally {
      setIsLoading(false);
    }
  }, [uiService]);

  const closeGuidelineModal = useCallback(() => {
    setUIState(prev => ({ ...prev, activeModal: null }));
  }, []);

  // Utility functions
  const getGuidelineById = useCallback((id: number): GuidelineCard | undefined => {
    return guidelines.find(g => g.id === id);
  }, [guidelines]);

  const getSelectedGuidelines = useCallback((): GuidelineCard[] => {
    return guidelines.filter(g => uiState.selectedGuidelines.includes(g.id));
  }, [guidelines, uiState.selectedGuidelines]);

  const getSourceTheme = useCallback((source: GuidelineSource): SourceTheme | undefined => {
    return sourceThemes.find(theme => theme.source === source);
  }, [sourceThemes]);

  const getCategoryBySpecialty = useCallback((specialty: Specialty): SpecialtyCategory | undefined => {
    return specialtyCategories.find(cat => cat.id === specialty);
  }, [specialtyCategories]);

  // Load specialty categories
  const loadSpecialtyCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const categories = await uiService.getSpecialtyCategories();
      setSpecialtyCategories(categories);
    } catch (err) {
      console.error('Error loading specialty categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [uiService]);

  // Load source themes
  const loadSourceThemes = useCallback(() => {
    const themes = uiService.getSourceThemes();
    setSourceThemes(themes);
  }, [uiService]);

  // Load available sources
  const loadAvailableSources = useCallback(async () => {
    try {
      const sources = await uiService.getAvailableSources();
      setAvailableSources(sources);
    } catch (err) {
      console.error('Error loading available sources:', err);
    }
  }, [uiService]);

  // Load guideline counts by source
  const loadGuidelineCountsBySource = useCallback(async () => {
    try {
      const counts = await uiService.getGuidelineCountsBySource();
      setGuidelineCountsBySource(counts);
    } catch (err) {
      console.error('Error loading guideline counts by source:', err);
    }
  }, [uiService]);

  // Effect to reload guidelines when filter changes
  useEffect(() => {
    loadGuidelines();
  }, [loadGuidelines]);

  // Initial load
  useEffect(() => {
    if (autoLoad) {
      loadGuidelines();
    }
    loadSpecialtyCategories();
    loadSourceThemes();
    loadAvailableSources();
    loadGuidelineCountsBySource();
  }, [autoLoad, loadGuidelines, loadSpecialtyCategories, loadSourceThemes, loadAvailableSources, loadGuidelineCountsBySource]);

  return {
    // State
    guidelines,
    specialtyCategories,
    sourceThemes,
    availableSources,
    guidelineCountsBySource,
    uiState,
    
    // Loading states
    isLoading,
    isLoadingCategories,
    error,
    
    // Actions
    loadGuidelines,
    searchGuidelines,
    filterGuidelines,
    setCurrentView,
    selectGuideline,
    deselectGuideline,
    clearSelection,
    
    // Modal actions
    openGuidelineModal,
    closeGuidelineModal,
    
    // Utility functions
    getGuidelineById,
    getSelectedGuidelines,
    getSourceTheme,
    getCategoryBySpecialty
  };
} 