// Post-consultation Alert Analysis API
// Performs comprehensive analysis after consultation completion

import { NextRequest, NextResponse } from 'next/server';
import { alertEngine } from '@/lib/alerts/alert-engine';
import { UnifiedAlert } from '@/types/alerts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      patientId, 
      encounterId,
      trigger = 'manual' // 'manual', 'clinical_engine_run', 'consultation_save'
    } = body;

    // Validate required parameters
    if (!patientId || !encounterId) {
      return NextResponse.json(
        { error: 'Missing required parameters: patientId and encounterId' },
        { status: 400 }
      );
    }

    console.log(`Starting post-consultation analysis for ${patientId}:${encounterId} (trigger: ${trigger})`);

    // Process comprehensive alerts
    const alerts = await alertEngine.processPostConsultationAlerts(
      patientId,
      encounterId
    );

    const result = {
      success: true,
      alerts,
      alertCount: alerts.length,
      trigger,
      timestamp: new Date().toISOString(),
      message: `Post-consultation analysis completed with ${alerts.length} alerts generated`
    };

    console.log(`Post-consultation analysis completed: ${alerts.length} alerts generated`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Post-consultation alert processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const encounterId = searchParams.get('encounterId');

    if (!patientId || !encounterId) {
      return NextResponse.json(
        { error: 'Missing required parameters: patientId and encounterId' },
        { status: 400 }
      );
    }

    // This endpoint can be used to check if post-consultation analysis has been run
    // For now, we'll return a simple status
    return NextResponse.json({
      message: 'Use POST method to trigger post-consultation analysis',
      patientId,
      encounterId
    });

  } catch (error) {
    console.error('Post-consultation alert API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 