import { NextRequest, NextResponse } from 'next/server';
import { ClinicalEngineServiceV3 } from '@/lib/clinicalEngineServiceV3';
import { ClinicalOutputPackage } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { patientId, encounterId, transcript } = await request.json();

    if (!patientId || !encounterId) {
      return NextResponse.json(
        { error: 'Missing required parameters: patientId and encounterId' },
        { status: 400 }
      );
    }

    console.log(`Clinical engine V3 request: patient ${patientId}, encounter ${encounterId}`);

    const engine = new ClinicalEngineServiceV3();
    const result: ClinicalOutputPackage = await engine.runDiagnosticPipeline(
      patientId,
      encounterId,
      transcript
    );

    console.log(`Clinical engine V3 completed successfully for patient ${patientId}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Enhanced clinical engine error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run enhanced clinical analysis', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 