import { NextRequest, NextResponse } from 'next/server';
import { IngestionOrchestrator } from '@/services/guidelines/ingestion-orchestrator';
import { GuidelineSource } from '@/types/guidelines';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source } = body;

    const orchestrator = new IngestionOrchestrator();

    if (source && source !== 'all') {
      // Ingest specific source
      if (!Object.values(['NICE', 'USPSTF', 'NCI_PDQ', 'RxNorm', 'MANUAL']).includes(source)) {
        return NextResponse.json(
          { error: 'Invalid source specified' },
          { status: 400 }
        );
      }

      const result = await orchestrator.ingestSource(source as GuidelineSource);
      return NextResponse.json(result);
    } else {
      // Ingest all sources
      const result = await orchestrator.ingestAll();
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: 'Failed to run ingestion process' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orchestrator = new IngestionOrchestrator();
    const sources = orchestrator.getAvailableSources();
    
    return NextResponse.json({
      availableSources: sources,
      message: 'Use POST to trigger ingestion'
    });
  } catch (error) {
    console.error('Error getting sources:', error);
    return NextResponse.json(
      { error: 'Failed to get available sources' },
      { status: 500 }
    );
  }
} 