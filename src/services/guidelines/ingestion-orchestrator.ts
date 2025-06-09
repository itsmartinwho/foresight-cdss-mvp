import { BaseGuidelineIngester, IngestionResult } from './base-ingester';
import { USPSTFIngester } from './uspstf-ingester';
import { RxNormIngester } from './rxnorm-ingester';
import { NICEIngester } from './nice-ingester';
import { NCIPDQIngester } from './nci-pdq-ingester';
import { GuidelineSource } from '@/types/guidelines';

export interface OverallIngestionResult {
  success: boolean;
  results: Record<GuidelineSource, IngestionResult>;
  totalDocumentsProcessed: number;
  totalDocumentsUpdated: number;
  errors: string[];
}

export class IngestionOrchestrator {
  private ingesters: Map<GuidelineSource, BaseGuidelineIngester>;

  constructor() {
    this.ingesters = new Map();
    this.ingesters.set('USPSTF', new USPSTFIngester());
    this.ingesters.set('RxNorm', new RxNormIngester());
    this.ingesters.set('NICE', new NICEIngester());
    this.ingesters.set('NCI_PDQ', new NCIPDQIngester());
  }

  /**
   * Run ingestion for all configured sources
   */
  async ingestAll(): Promise<OverallIngestionResult> {
    const result: OverallIngestionResult = {
      success: true,
      results: {} as Record<GuidelineSource, IngestionResult>,
      totalDocumentsProcessed: 0,
      totalDocumentsUpdated: 0,
      errors: []
    };

    for (const [source, ingester] of this.ingesters) {
      if (!ingester.isConfigured()) {
        console.log(`Skipping ${source} - not configured`);
        continue;
      }

      try {
        console.log(`Starting ingestion for ${source}...`);
        const sourceResult = await ingester.ingest();
        
        result.results[source] = sourceResult;
        result.totalDocumentsProcessed += sourceResult.documentsProcessed;
        result.totalDocumentsUpdated += sourceResult.documentsUpdated;
        
        if (!sourceResult.success) {
          result.success = false;
          result.errors.push(...sourceResult.errors);
        }
        
        console.log(`Completed ${source}: processed ${sourceResult.documentsProcessed}, updated ${sourceResult.documentsUpdated}`);
      } catch (error) {
        const errorMsg = `Failed to run ingestion for ${source}: ${error}`;
        result.errors.push(errorMsg);
        result.success = false;
        console.error(errorMsg);
      }
    }

    return result;
  }

  /**
   * Run ingestion for a specific source
   */
  async ingestSource(source: GuidelineSource): Promise<IngestionResult> {
    const ingester = this.ingesters.get(source);
    
    if (!ingester) {
      throw new Error(`No ingester configured for source: ${source}`);
    }
    
    if (!ingester.isConfigured()) {
      throw new Error(`Ingester for ${source} is not properly configured`);
    }

    return await ingester.ingest();
  }

  /**
   * Get list of available sources and their configuration status
   */
  getAvailableSources(): Array<{ source: GuidelineSource; configured: boolean }> {
    return Array.from(this.ingesters.entries()).map(([source, ingester]) => ({
      source,
      configured: ingester.isConfigured()
    }));
  }
} 