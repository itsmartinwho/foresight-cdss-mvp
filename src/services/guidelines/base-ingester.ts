import { GuidelineDoc, GuidelineSource, Specialty, GuidelineMetadata } from '@/types/guidelines';
import { createClient } from '@supabase/supabase-js';

export interface IngestionResult {
  success: boolean;
  documentsProcessed: number;
  documentsUpdated: number;
  errors: string[];
}

export abstract class BaseGuidelineIngester {
  protected supabase;
  protected source: GuidelineSource;

  constructor(source: GuidelineSource) {
    this.source = source;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main ingestion method that subclasses must implement
   */
  abstract ingest(): Promise<IngestionResult>;

  /**
   * Check if the ingester has required configuration
   */
  abstract isConfigured(): boolean;

  /**
   * Clean and normalize text content
   */
  protected cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim();
  }

  /**
   * Convert HTML to Markdown-like format
   */
  protected htmlToMarkdown(html: string): string {
    return html
      // Headers
      .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, text) => {
        const hashes = '#'.repeat(parseInt(level));
        return `\n${hashes} ${text.trim()}\n`;
      })
      // Paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      // Lists
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Save or update a guideline document
   */
  protected async saveGuideline(
    title: string,
    content: string,
    specialty: Specialty,
    metadata: GuidelineMetadata = {}
  ): Promise<number | null> {
    try {
      const cleanedContent = this.cleanContent(content);
      
      // Check if document already exists based on title and source
      const { data: existing } = await this.supabase
        .from('guidelines_docs')
        .select('id, last_updated')
        .eq('title', title)
        .eq('source', this.source)
        .single();

      if (existing) {
        // Update existing document
        const { data, error } = await this.supabase
          .from('guidelines_docs')
          .update({
            content: cleanedContent,
            specialty,
            metadata,
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (error) {
          console.error('Error updating guideline:', error);
          return null;
        }
        return data.id;
      } else {
        // Insert new document
        const { data, error } = await this.supabase
          .from('guidelines_docs')
          .insert({
            title,
            content: cleanedContent,
            source: this.source,
            specialty,
            metadata
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error inserting guideline:', error);
          return null;
        }
        return data.id;
      }
    } catch (error) {
      console.error('Error saving guideline:', error);
      return null;
    }
  }

  /**
   * Log the ingestion process
   */
  protected async logIngestion(
    status: 'started' | 'completed' | 'failed',
    message?: string,
    documentsUpdated: number = 0
  ): Promise<void> {
    try {
      const logData: any = {
        source: this.source,
        status,
        documents_updated: documentsUpdated
      };

      if (message) {
        logData.message = message;
      }

      if (status === 'completed' || status === 'failed') {
        logData.completed_at = new Date().toISOString();
      }

      await this.supabase
        .from('guidelines_refresh_log')
        .insert(logData);
    } catch (error) {
      console.error('Error logging ingestion:', error);
    }
  }

  /**
   * Map condition/topic to appropriate specialty
   */
  protected mapToSpecialty(topic: string): Specialty {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('cancer') || topicLower.includes('oncology') || 
        topicLower.includes('tumor') || topicLower.includes('malignant')) {
      return 'Oncology';
    }
    
    if (topicLower.includes('diabetes') || topicLower.includes('thyroid') || 
        topicLower.includes('endocrine')) {
      return 'Endocrinology';
    }
    
    if (topicLower.includes('heart') || topicLower.includes('cardiac') || 
        topicLower.includes('hypertension') || topicLower.includes('cardiovascular')) {
      return 'Cardiology';
    }
    
    if (topicLower.includes('arthritis') || topicLower.includes('lupus') || 
        topicLower.includes('rheumatoid') || topicLower.includes('autoimmune')) {
      return 'Rheumatology';
    }
    
    if (topicLower.includes('drug') || topicLower.includes('interaction') || 
        topicLower.includes('medication')) {
      return 'Pharmacology';
    }
    
    if (topicLower.includes('lung') || topicLower.includes('pulmonary') || 
        topicLower.includes('respiratory')) {
      return 'Pulmonology';
    }
    
    if (topicLower.includes('brain') || topicLower.includes('neuro') || 
        topicLower.includes('seizure')) {
      return 'Neurology';
    }
    
    if (topicLower.includes('stomach') || topicLower.includes('gastro') || 
        topicLower.includes('digestive')) {
      return 'Gastroenterology';
    }
    
    if (topicLower.includes('screening') || topicLower.includes('prevention') || 
        topicLower.includes('primary care')) {
      return 'Primary Care';
    }
    
    return 'General Medicine';
  }
} 