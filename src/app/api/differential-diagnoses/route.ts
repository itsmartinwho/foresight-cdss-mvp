import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch differential diagnoses for a specific encounter
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

    // Get patient UUID
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', patientId)
      .single();

    if (patientError || !patients) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get encounter UUID
    const { data: encounters, error: encounterError } = await supabase
      .from('encounters')
      .select('id')
      .eq('encounter_id', encounterId)
      .eq('patient_supabase_id', patients.id)
      .single();

    if (encounterError || !encounters) {
      return NextResponse.json(
        { error: 'Encounter not found' },
        { status: 404 }
      );
    }

    // Fetch differential diagnoses
    const { data: differentialDiagnoses, error } = await supabase
      .from('differential_diagnoses')
      .select('*')
      .eq('patient_id', patients.id)
      .eq('encounter_id', encounters.id)
      .order('rank_order', { ascending: true });

    if (error) {
      console.error('Error fetching differential diagnoses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch differential diagnoses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      differentialDiagnoses: differentialDiagnoses || [],
      patientId,
      encounterId
    });
  } catch (error) {
    console.error('Error in GET /api/differential-diagnoses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new differential diagnosis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, encounterId, diagnosisName, likelihood, keyFactors, rankOrder } = body;

    if (!patientId || !encounterId || !diagnosisName) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, encounterId, diagnosisName' },
        { status: 400 }
      );
    }

    // Get patient UUID
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', patientId)
      .single();

    if (patientError || !patients) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get encounter UUID
    const { data: encounters, error: encounterError } = await supabase
      .from('encounters')
      .select('id')
      .eq('encounter_id', encounterId)
      .eq('patient_supabase_id', patients.id)
      .single();

    if (encounterError || !encounters) {
      return NextResponse.json(
        { error: 'Encounter not found' },
        { status: 404 }
      );
    }

    // If no rank order provided, get the next available rank
    let finalRankOrder = rankOrder;
    if (!finalRankOrder) {
      const { data: existingDiagnoses } = await supabase
        .from('differential_diagnoses')
        .select('rank_order')
        .eq('patient_id', patients.id)
        .eq('encounter_id', encounters.id)
        .order('rank_order', { ascending: false })
        .limit(1);

      finalRankOrder = existingDiagnoses && existingDiagnoses.length > 0 
        ? existingDiagnoses[0].rank_order + 1 
        : 1;
    }

    // Create new differential diagnosis
    const { data: newDiagnosis, error } = await supabase
      .from('differential_diagnoses')
      .insert({
        patient_id: patients.id,
        encounter_id: encounters.id,
        diagnosis_name: diagnosisName,
        likelihood: likelihood || 'Medium',
        key_factors: keyFactors || '',
        rank_order: finalRankOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating differential diagnosis:', error);
      return NextResponse.json(
        { error: 'Failed to create differential diagnosis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      differentialDiagnosis: newDiagnosis,
      message: 'Differential diagnosis created successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/differential-diagnoses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing differential diagnosis
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, diagnosisName, likelihood, keyFactors, rankOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (diagnosisName !== undefined) updateData.diagnosis_name = diagnosisName;
    if (likelihood !== undefined) updateData.likelihood = likelihood;
    if (keyFactors !== undefined) updateData.key_factors = keyFactors;
    if (rankOrder !== undefined) updateData.rank_order = rankOrder;

    const { data: updatedDiagnosis, error } = await supabase
      .from('differential_diagnoses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating differential diagnosis:', error);
      return NextResponse.json(
        { error: 'Failed to update differential diagnosis' },
        { status: 500 }
      );
    }

    if (!updatedDiagnosis) {
      return NextResponse.json(
        { error: 'Differential diagnosis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      differentialDiagnosis: updatedDiagnosis,
      message: 'Differential diagnosis updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/differential-diagnoses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a differential diagnosis
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('differential_diagnoses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting differential diagnosis:', error);
      return NextResponse.json(
        { error: 'Failed to delete differential diagnosis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Differential diagnosis deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/differential-diagnoses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 