import { getSupabaseClient } from '@/lib/supabaseClient';
import OpenAI from 'openai';
import { GuidelineSearchResult } from '@/types/guidelines';

export interface TextChunk {
  content: string;
  metadata: Record<string, any>;
}

export class EmbeddingService {
  private supabase;
  private openai: OpenAI;

  constructor() {
    try {
      this.supabase = getSupabaseClient();
      
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!
      });
    } catch (error) {
      console.error('Failed to initialize EmbeddingService:', error);
      this.supabase = null as any;
      this.openai = null as any;
    }
  }

  /**
   * Process all guidelines that don't have embeddings yet
   */
  async processAllGuidelines(): Promise<{ processed: number; errors: string[] }> {
    const result = { processed: 0, errors: [] as string[] };

    try {
      // Get all guidelines to process (we'll handle duplicates in processDocument)
      const { data: docs, error } = await this.supabase
        .from('guidelines_docs')
        .select('*');

      if (error) {
        throw new Error(`Failed to fetch guidelines: ${error.message}`);
      }

      if (!docs || docs.length === 0) {
        console.log('No new guidelines to process');
        return result;
      }

      for (const doc of docs) {
        try {
          await this.processDocument(doc);
          result.processed++;
        } catch (error) {
          const errorMsg = `Failed to process document ${doc.id}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

    } catch (error) {
      result.errors.push(`Failed to process guidelines: ${error}`);
    }

    return result;
  }

  /**
   * Process a single guideline document
   */
  async processDocument(doc: any): Promise<void> {
    // First, delete any existing vectors for this document
    await this.supabase
      .from('guideline_vectors')
      .delete()
      .eq('doc_id', doc.id);

    // Chunk the document content
    const chunks = this.chunkText(doc.content, doc);

    // Process chunks in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await this.processBatch(batch, doc.id);
      
      // Small delay to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process a batch of chunks
   */
  private async processBatch(chunks: TextChunk[], docId: number): Promise<void> {
    const embeddings = await this.getEmbeddings(chunks.map(c => c.content));
    
    const vectors = chunks.map((chunk, index) => ({
      doc_id: docId,
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: embeddings[index]
    }));

    const { error } = await this.supabase
      .from('guideline_vectors')
      .insert(vectors);

    if (error) {
      throw new Error(`Failed to insert vectors: ${error.message}`);
    }
  }

  /**
   * Get embeddings from OpenAI
   */
  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      throw new Error(`Failed to get embeddings: ${error}`);
    }
  }

  /**
   * Chunk text into smaller pieces for embedding
   */
  private chunkText(content: string, doc: any): TextChunk[] {
    const chunks: TextChunk[] = [];
    const maxChunkSize = 500; // tokens (approximate)
    const overlap = 50; // tokens overlap between chunks
    
    // Split by paragraphs first
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);
      
      if (currentTokens + paragraphTokens > maxChunkSize && currentChunk) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            ...doc.metadata,
            source: doc.source,
            specialty: doc.specialty,
            title: doc.title,
            doc_id: doc.id
          }
        });

        // Start new chunk with overlap
        const overlapText = this.getLastSentences(currentChunk, overlap);
        currentChunk = overlapText + paragraph;
        currentTokens = this.estimateTokens(currentChunk);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          ...doc.metadata,
          source: doc.source,
          specialty: doc.specialty,
          title: doc.title,
          doc_id: doc.id
        }
      });
    }

    return chunks;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get last few sentences for overlap
   */
  private getLastSentences(text: string, maxTokens: number): string {
    const sentences = text.split(/[.!?]+/);
    let result = '';
    let tokens = 0;
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i].trim();
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (tokens + sentenceTokens > maxTokens) {
        break;
      }
      
      result = sentence + '. ' + result;
      tokens += sentenceTokens;
    }
    
    return result.trim();
  }

  /**
   * Search for similar guidelines using embeddings
   */
  async searchSimilar(
    query: string, 
    specialty?: string, 
    matchCount: number = 5
  ): Promise<GuidelineSearchResult[]> {
    if (!this.supabase || !this.openai) {
      console.warn('EmbeddingService not properly initialized, returning empty results');
      return [];
    }

    try {
      // Get embedding for query
      const queryEmbedding = await this.getEmbeddings([query]);
      
      // Build filter (empty object means no filter)
      const filter = {};
      
      // Call the database function
      const { data, error } = await this.supabase.rpc('match_guidelines', {
        query_embedding: queryEmbedding[0],
        match_count: matchCount,
        filter: filter
      });

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Similarity search error:', error);
      return [];
    }
  }

  /**
   * Re-embed a specific document (for updates)
   */
  async reEmbedDocument(docId: number): Promise<void> {
    const { data: doc, error } = await this.supabase
      .from('guidelines_docs')
      .select('*')
      .eq('id', docId)
      .single();

    if (error || !doc) {
      throw new Error(`Document not found: ${docId}`);
    }

    await this.processDocument(doc);
  }
} 