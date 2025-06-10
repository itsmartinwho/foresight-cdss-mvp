export interface GuidelineDoc {
  id: number;
  title: string;
  content: string;
  source: GuidelineSource;
  specialty: Specialty;
  metadata: Record<string, any>;
  last_updated: string;
  created_at: string;
}

export interface GuidelineVector {
  id: number;
  doc_id: number;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  created_at: string;
}

export interface GuidelineSearchResult {
  id: number;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export interface GuidelineTextSearchResult {
  id: number;
  title: string;
  content: string; // First 500 chars for preview
  source: GuidelineSource;
  specialty: Specialty;
  similarity: number;
}

export type GuidelineSource = 
  | 'NICE'
  | 'USPSTF' 
  | 'NCI_PDQ'
  | 'RxNorm'
  | 'MANUAL'; // For manually added guidelines

export type Specialty = 
  | 'All'
  | 'Oncology'
  | 'Primary Care'
  | 'Rheumatology'
  | 'Pharmacology'
  | 'Cardiology'
  | 'Endocrinology'
  | 'Neurology'
  | 'Pulmonology'
  | 'Gastroenterology'
  | 'Infectious Disease'
  | 'General Medicine'
  | 'Mental Health Conditions and Substance Abuse'
  | 'Obstetric and Gynecologic Conditions';

export interface GuidelineRefreshLog {
  id: number;
  source: GuidelineSource;
  status: 'started' | 'completed' | 'failed';
  message?: string;
  documents_updated: number;
  started_at: string;
  completed_at?: string;
}

export interface GuidelineIngestionConfig {
  source: GuidelineSource;
  apiKey?: string;
  baseUrl: string;
  enabled: boolean;
  lastRefresh?: string;
}

export interface GuidelineMetadata {
  guideline_id?: string;
  publication_date?: string;
  last_reviewed?: string;
  category?: string;
  author?: string;
  organization?: string;
  grade?: string; // For USPSTF recommendations
  cancer_type?: string; // For NCI PDQ
  drug_names?: string[]; // For RxNorm interactions
  severity?: 'low' | 'moderate' | 'high'; // For drug interactions
  section?: string; // For document chunks
  url?: string; // URL to original source
}

// UI-specific types for guidelines interface

export interface GuidelineCard {
  id: number;
  title: string;
  source: GuidelineSource;
  specialty: Specialty;
  preview: string;
  metadata: GuidelineMetadata;
  lastUpdated: string;
  isBookmarked: boolean;
  isRecentlyViewed: boolean;
  isRecentlyUpdated: boolean;
}

export interface GuidelineSection {
  id: string;
  title: string;
  content: string;
  type: 'key_recommendations' | 'implementation' | 'rationale' | 'population_criteria' | 'other';
  isExpanded: boolean;
}

export interface GuidelineModalData {
  id: number;
  title: string;
  source: GuidelineSource;
  specialty: Specialty;
  metadata: GuidelineMetadata;
  sections: GuidelineSection[];
  breadcrumbs: string[];
  fullContent: string;
}

export interface GuidelineFilter {
  sources: GuidelineSource[];
  specialties: Specialty[];
  searchQuery: string;
  sortBy: 'relevance' | 'recency' | 'authority' | 'alphabetical';
  showBookmarksOnly: boolean;
}

export interface GuidelineUIState {
  currentView: 'grid' | 'list' | 'comparison';
  selectedGuidelines: number[];
  activeModal: GuidelineModalData | null;
  filter: GuidelineFilter;
  isLoading: boolean;
  error: string | null;
}

export interface GuidelineBookmark {
  id: number;
  guidelineId: number;
  userId: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface GuidelineRecentView {
  guidelineId: number;
  viewedAt: string;
  duration: number; // seconds spent viewing
}

export interface GuidelineReference {
  id: number;
  title: string;
  source: GuidelineSource;
  section?: string;
  relevanceScore: number;
  excerpt?: string;
}

export interface SpecialtyCategory {
  id: Specialty;
  displayName: string;
  icon: string;
  description: string;
  guidelineCount: number;
  color: string;
}

export interface SourceTheme {
  source: GuidelineSource;
  primaryColor: string;
  secondaryColor: string;
  badgeColor: string;
  iconUrl?: string;
  displayName: string;
}

export interface EnhancedSearchResult {
  type: 'guideline' | 'patient' | 'note' | 'other';
  guideline?: GuidelineSearchResultItem;
  patient?: any; // To be defined based on patient types
  note?: any; // To be defined based on note types
  other?: any;
}

export interface GuidelineSearchResultItem {
  id: number;
  title: string;
  source: GuidelineSource;
  specialty: Specialty;
  preview: string;
  relevanceScore: number;
  metadata: GuidelineMetadata;
  canApplyToPatient: boolean;
}

export interface GuidelineAdvisorConfig {
  selectedSpecialty: Specialty;
  enableGuidelineReferences: boolean;
  maxReferences: number;
  minRelevanceScore: number;
}

export interface GuidelineUsageAnalytics {
  guidelineId: number;
  viewCount: number;
  bookmarkCount: number;
  lastViewed: string;
  averageViewDuration: number;
  popularSections: string[];
}