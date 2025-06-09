import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService } from '@/services/guidelines/embedding-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docId } = body;

    const embeddingService = new EmbeddingService();

    if (docId) {
      // Re-embed specific document
      await embeddingService.reEmbedDocument(parseInt(docId));
      return NextResponse.json({ 
        success: true, 
        message: `Document ${docId} re-embedded successfully` 
      });
    } else {
      // Process all new guidelines
      const result = await embeddingService.processAllGuidelines();
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Embedding error:', error);
    return NextResponse.json(
      { error: 'Failed to process embeddings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger embedding process',
    options: {
      'POST /': 'Process all guidelines without embeddings',
      'POST / with docId': 'Re-embed specific document'
    }
  });
} 