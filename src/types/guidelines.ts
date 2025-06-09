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
  | 'General Medicine';

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
} 