import { IngestionOrchestrator } from './ingestion-orchestrator';
import { EmbeddingService } from './embedding-service';
import { GuidelineSource } from '@/types/guidelines';
import { createClient } from '@supabase/supabase-js';

export interface ScheduledJob {
  id: string;
  name: string;
  cronExpression: string;
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
  source?: GuidelineSource;
}

export interface ScheduleConfig {
  monthlyRefresh: boolean;
  weeklyRefresh: boolean;
  customCron?: string;
  sources: GuidelineSource[];
  enableEmbeddings: boolean;
}

export class GuidelineScheduler {
  private supabase;
  private orchestrator: IngestionOrchestrator;
  private embeddingService: EmbeddingService;
  private isRunning: boolean = false;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.orchestrator = new IngestionOrchestrator();
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Set up default monthly refresh schedule
   */
  async setupMonthlyRefresh(): Promise<void> {
    const config: ScheduleConfig = {
      monthlyRefresh: true,
      weeklyRefresh: false,
      sources: ['USPSTF', 'NICE', 'NCI_PDQ', 'RxNorm'],
      enableEmbeddings: true
    };

    await this.saveScheduleConfig(config);
    console.log('Monthly refresh schedule configured');
  }

  /**
   * Run the scheduled refresh job
   */
  async runScheduledRefresh(sources?: GuidelineSource[]): Promise<void> {
    if (this.isRunning) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      console.log('🔄 Starting scheduled guidelines refresh...');
      
      await this.logScheduledRun('started', 'Beginning scheduled refresh of clinical guidelines');

      // Get sources to refresh
      const sourcesToRefresh = sources || ['USPSTF', 'NICE', 'NCI_PDQ'];
      let totalUpdated = 0;
      const errors: string[] = [];

      // Run ingestion for each source
      for (const source of sourcesToRefresh) {
        try {
          console.log(`📥 Refreshing ${source} guidelines...`);
          const result = await this.orchestrator.ingestSource(source);
          
          totalUpdated += result.documentsUpdated;
          
          if (!result.success) {
            errors.push(...result.errors);
          }
          
          console.log(`✅ ${source}: ${result.documentsUpdated} guidelines updated`);
        } catch (error) {
          const errorMsg = `Failed to refresh ${source}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Generate embeddings for new/updated content
      if (totalUpdated > 0) {
        try {
          console.log('🧠 Generating embeddings for updated content...');
          const embeddingResult = await this.embeddingService.processAllGuidelines();
          console.log(`✅ Processed embeddings for ${embeddingResult.processed} documents`);
          
          if (embeddingResult.errors.length > 0) {
            errors.push(...embeddingResult.errors);
          }
        } catch (error) {
          errors.push(`Failed to generate embeddings: ${error}`);
        }
      }

      const success = errors.length === 0;
      const duration = Date.now() - startTime.getTime();
      
      await this.logScheduledRun(
        success ? 'completed' : 'failed',
        `Refresh completed in ${Math.round(duration / 1000)}s. Updated ${totalUpdated} guidelines.`,
        totalUpdated,
        errors
      );

      console.log(`🎉 Scheduled refresh completed: ${totalUpdated} guidelines updated`);
      
    } catch (error) {
      await this.logScheduledRun('failed', `Critical error during refresh: ${error}`, 0, [String(error)]);
      console.error('Scheduled refresh failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get next scheduled run time based on monthly cadence
   */
  getNextMonthlyRun(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    // Schedule for first Sunday of next month at 2 AM
    while (nextMonth.getDay() !== 0) {
      nextMonth.setDate(nextMonth.getDate() + 1);
    }
    nextMonth.setHours(2, 0, 0, 0);
    return nextMonth;
  }

  /**
   * Check if refresh is due based on schedule
   */
  async isRefreshDue(): Promise<boolean> {
    try {
      const { data: lastRun } = await this.supabase
        .from('guidelines_refresh_log')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastRun?.completed_at) {
        return true; // No previous successful run
      }

      const lastRunDate = new Date(lastRun.completed_at);
      const now = new Date();
      const daysSinceLastRun = (now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Refresh if more than 30 days since last run
      return daysSinceLastRun >= 30;
    } catch (error) {
      console.error('Error checking refresh due date:', error);
      return true; // Default to refresh if error
    }
  }

  /**
   * Manual trigger for immediate refresh
   */
  async triggerManualRefresh(sources?: GuidelineSource[]): Promise<void> {
    console.log('🚀 Manual refresh triggered');
    await this.runScheduledRefresh(sources);
  }

  /**
   * Get schedule status and next run info
   */
  async getScheduleStatus(): Promise<{
    nextRun: Date;
    lastRun?: Date;
    isDue: boolean;
    isRunning: boolean;
  }> {
    const nextRun = this.getNextMonthlyRun();
    const isDue = await this.isRefreshDue();
    
    let lastRun: Date | undefined;
    try {
      const { data } = await this.supabase
        .from('guidelines_refresh_log')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.completed_at) {
        lastRun = new Date(data.completed_at);
      }
    } catch (error) {
      // No previous runs
    }

    return {
      nextRun,
      lastRun,
      isDue,
      isRunning: this.isRunning
    };
  }

  /**
   * Save schedule configuration
   */
  private async saveScheduleConfig(config: ScheduleConfig): Promise<void> {
    // This could be stored in database if needed for UI configuration
    console.log('Schedule config saved:', config);
  }

  /**
   * Log scheduled run events
   */
  private async logScheduledRun(
    status: 'started' | 'completed' | 'failed',
    message: string,
    documentsUpdated: number = 0,
    errors: string[] = []
  ): Promise<void> {
    try {
      const logData: any = {
        source: 'SCHEDULER',
        status,
        message: errors.length > 0 ? `${message}\nErrors: ${errors.join('; ')}` : message,
        documents_updated: documentsUpdated
      };

      if (status === 'completed' || status === 'failed') {
        logData.completed_at = new Date().toISOString();
      }

      await this.supabase
        .from('guidelines_refresh_log')
        .insert(logData);
    } catch (error) {
      console.error('Error logging scheduled run:', error);
    }
  }
}

// Singleton instance for the scheduler
let schedulerInstance: GuidelineScheduler | null = null;

export function getScheduler(): GuidelineScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new GuidelineScheduler();
  }
  return schedulerInstance;
} 