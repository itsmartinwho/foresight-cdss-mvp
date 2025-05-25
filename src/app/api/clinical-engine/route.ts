import { NextRequest, NextResponse } from 'next/server';
import { ClinicalEngineServiceV2 } from '@/lib/clinicalEngineServiceV2';
import { ClinicalOutputPackage } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { patientId, encounterId } = await request.json();

    if (!patientId || !encounterId) {
      return NextResponse.json(
        { error: 'Missing required parameters: patientId and encounterId' },
        { status: 400 }
      );
    }

    const engine = new ClinicalEngineServiceV2();
    const result: ClinicalOutputPackage = await engine.runDiagnosticPipeline(
      patientId,
      encounterId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Clinical engine error:', error);
    return NextResponse.json(
      { error: 'Failed to run clinical analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 