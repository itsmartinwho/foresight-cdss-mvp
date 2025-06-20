#!/usr/bin/env node
/**
 * Enrich target patients' encounters according to decision-tree rules.
 *
 * SAFETY MEASURES
 * 1. Only updates specific encounter rows (WHERE id = ...).
 * 2. Backs up original fields in encounters.extra_data.original_*
 * 3. Never deletes data.
 * 4. Adds `extra_data.enrichment_done = true` to avoid duplicate processing.
 *
 * PRIORITIES IMPLEMENTED
 * 1. Duplicate reason fixes (Maria Gomez)
 * 2. Transcript transformation / SOAP separation
 * 3. SOAP note structuring
 * 4. Differential diagnoses generation
 * 5. Rich content placeholders
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://lmwbmckvlvzwftjwatxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd2JtY2t2bHZ6d2Z0andhdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzc0MTIsImV4cCI6MjA2MjY1MzQxMn0.vb8ox4rmreRTbZZ-KZVos-7veAZaSu-V6GU79GsLj24';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TARGET_PATIENT_NAMES = ['Maria Gomez', 'James Lee', 'Priya Patel', 'Alice Smith'];

////////////////////////////////////////////////////////////////////////////////
// Helper generators
////////////////////////////////////////////////////////////////////////////////

function generateUniqueReasons(encounters, duplicateReason) {
  const baseReasons = [
    'Follow-up headache evaluation',
    'Migraine management consultation',
    'Neurological assessment for headaches',
    'Chronic headache review',
    'Headache pattern analysis',
    'Migraine prophylaxis consultation',
    'Headache diary review'
  ];
  
  let reasonIndex = 0;
  return encounters.map(enc => {
    if (enc.reason_display_text === duplicateReason) {
      return baseReasons[reasonIndex++ % baseReasons.length];
    }
    return enc.reason_display_text;
  });
}

function isTranscriptConversational(text = '') {
  return /doctor:|patient:|dr\.|pt\.|physician:|clinician:/i.test(text);
}

function hasSOAPPattern(text = '') {
  return /\b(S:|Subjective:|O:|Objective:|A:|Assessment:|P:|Plan:)/i.test(text);
}

function isStub(text = '') {
  const trimmed = text.trim();
  return trimmed.length < 120 || trimmed.split(/\s+/).length < 20;
}

function transformToConversational(original, patientFirstName) {
  if (!original) {
    return `Doctor: Hello ${patientFirstName}, what brings you in today?
${patientFirstName}: I've been experiencing some health concerns that I'd like to discuss.
Doctor: Tell me more about your symptoms.
${patientFirstName}: I've noticed some changes that are concerning me.
Doctor: Let's do a thorough evaluation to understand what's going on.`;
  }
  
  // If it has SOAP format, extract meaningful content
  if (hasSOAPPattern(original)) {
    const lines = original.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const conversational = [];
    
    lines.forEach(line => {
      // Remove SOAP headers and convert to dialogue
      const cleaned = line.replace(/^(S:|O:|A:|P:|Subjective:|Objective:|Assessment:|Plan:)/i, '').trim();
      if (cleaned && cleaned.length > 10) {
        if (line.match(/^(S:|Subjective:)/i)) {
          conversational.push(`${patientFirstName}: ${cleaned}`);
        } else {
          conversational.push(`Doctor: ${cleaned}`);
        }
      }
    });
    
    if (conversational.length === 0) {
      return `Doctor: Hello ${patientFirstName}, how are you feeling today?
${patientFirstName}: Thank you for seeing me, I have some concerns.
Doctor: Let's discuss what's bothering you.`;
    }
    
    return conversational.join('\n');
  }
  
  // If already conversational but needs improvement
  if (isTranscriptConversational(original)) {
    return original; // Keep as is
  }
  
  // Transform non-conversational text to dialogue
  const sentences = original.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const dialogue = [];
  
  sentences.forEach((sentence, index) => {
    const cleaned = sentence.trim();
    if (cleaned) {
      const speaker = index % 2 === 0 ? 'Doctor' : patientFirstName;
      dialogue.push(`${speaker}: ${cleaned}.`);
    }
  });
  
  return dialogue.length > 0 ? dialogue.join('\n') : 
    `Doctor: Hello ${patientFirstName}, what brings you in today?\n${patientFirstName}: ${original}`;
}

function extractSOAPFromTranscript(transcript) {
  // Try to extract SOAP content from mixed transcript
  const soapSections = {
    S: '',
    O: '',
    A: '',
    P: ''
  };
  
  if (hasSOAPPattern(transcript)) {
    const lines = transcript.split(/\n+/);
    let currentSection = 'S';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (/^S:|Subjective:/i.test(trimmed)) {
        currentSection = 'S';
        soapSections.S += trimmed.replace(/^S:|Subjective:/i, '').trim() + ' ';
      } else if (/^O:|Objective:/i.test(trimmed)) {
        currentSection = 'O';
        soapSections.O += trimmed.replace(/^O:|Objective:/i, '').trim() + ' ';
      } else if (/^A:|Assessment:/i.test(trimmed)) {
        currentSection = 'A';
        soapSections.A += trimmed.replace(/^A:|Assessment:/i, '').trim() + ' ';
      } else if (/^P:|Plan:/i.test(trimmed)) {
        currentSection = 'P';
        soapSections.P += trimmed.replace(/^P:|Plan:/i, '').trim() + ' ';
      } else if (trimmed && !/(doctor|patient):/i.test(trimmed)) {
        soapSections[currentSection] += trimmed + ' ';
      }
    });
  }
  
  // Generate default SOAP if sections are empty
  return `S: ${soapSections.S.trim() || 'Patient reports chief complaint and associated symptoms.'}
O: ${soapSections.O.trim() || 'Vital signs stable. Physical examination findings documented.'}
A: ${soapSections.A.trim() || 'Clinical assessment based on history and examination.'}
P: ${soapSections.P.trim() || 'Treatment plan includes appropriate interventions and follow-up.'}`;
}

function generateDifferentialDiagnoses(reason, patientName) {
  const commonDifferentials = {
    'headache': [
      { name: 'Tension-type headache', likelihood: 'High' },
      { name: 'Migraine without aura', likelihood: 'Medium' },
      { name: 'Cluster headache', likelihood: 'Low' }
    ],
    'migraine': [
      { name: 'Migraine with aura', likelihood: 'High' },
      { name: 'Tension-type headache', likelihood: 'Medium' },
      { name: 'Medication overuse headache', likelihood: 'Low' }
    ],
    'chest pain': [
      { name: 'Musculoskeletal chest pain', likelihood: 'High' },
      { name: 'Gastroesophageal reflux', likelihood: 'Medium' },
      { name: 'Anxiety-related chest pain', likelihood: 'Low' }
    ],
    'default': [
      { name: 'Primary condition as stated', likelihood: 'High' },
      { name: 'Related secondary condition', likelihood: 'Medium' },
      { name: 'Alternative diagnosis', likelihood: 'Low' }
    ]
  };
  
  const reasonLower = reason.toLowerCase();
  let differentials = commonDifferentials.default;
  
  if (reasonLower.includes('headache') || reasonLower.includes('migraine')) {
    differentials = reasonLower.includes('migraine') ? 
      commonDifferentials.migraine : commonDifferentials.headache;
  } else if (reasonLower.includes('chest')) {
    differentials = commonDifferentials.chest;
  }
  
  return differentials;
}

async function enrichPatient(patientRow) {
  const patientName = patientRow.name;
  const patientFirstName = patientName.split(' ')[0];
  console.log(`\n🔧 Enriching patient ${patientName}...`);
  
  const { data: encounters, error } = await supabase
    .from('encounters')
    .select('*')
    .eq('patient_supabase_id', patientRow.id)
    .eq('is_deleted', false)
    .order('scheduled_start_datetime');
    
  if (error) throw error;
  console.log(`📋 Found ${encounters.length} encounters to process`);

  // Step 1: Handle duplicate reasons (Maria Gomez specific)
  let uniqueReasons = [];
  if (patientName.includes('Maria')) {
    const reasonCounts = {};
    encounters.forEach(enc => {
      const reason = enc.reason_display_text || '';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    
    const duplicateReason = Object.keys(reasonCounts).find(reason => reasonCounts[reason] > 1);
    if (duplicateReason) {
      console.log(`🔁 Found duplicate reason: "${duplicateReason}" (${reasonCounts[duplicateReason]} times)`);
      uniqueReasons = generateUniqueReasons(encounters, duplicateReason);
    }
  }

  let updateCount = 0;
  
  for (let i = 0; i < encounters.length; i++) {
    const enc = encounters[i];
    const updates = {};
    const extraBackup = { ...(enc.extra_data || {}) };
    
    // Skip if already enriched
    if (extraBackup.enrichment_done) {
      console.log(`⏭️  Skipping encounter ${enc.encounter_id} - already enriched`);
      continue;
    }

    console.log(`\n🔄 Processing encounter ${enc.encounter_id} (${enc.reason_display_text})`);

    ////////////////////////////////////////////////////////////
    // Priority 1: Fix duplicate reasons
    if (uniqueReasons.length > 0 && uniqueReasons[i] !== enc.reason_display_text) {
      extraBackup.original_reason = enc.reason_display_text;
      updates.reason_display_text = uniqueReasons[i];
      console.log(`  📝 Updated reason: "${enc.reason_display_text}" → "${uniqueReasons[i]}"`);
    }

    ////////////////////////////////////////////////////////////
    // Priority 2: Transform transcript format
    const needsTranscriptWork =
      !isTranscriptConversational(enc.transcript || '') ||
      hasSOAPPattern(enc.transcript || '') ||
      isStub(enc.transcript || '');

    if (needsTranscriptWork) {
      extraBackup.original_transcript = enc.transcript;
      updates.transcript = transformToConversational(enc.transcript || '', patientFirstName);
      console.log(`  💬 Transformed transcript to conversational format`);
    }

    ////////////////////////////////////////////////////////////
    // Priority 3: Handle SOAP notes
    const currentTranscript = updates.transcript || enc.transcript || '';
    const hasSOAPInTranscript = hasSOAPPattern(currentTranscript);
    const hasProperSOAP = enc.soap_note && 
      /S:|Subjective:/i.test(enc.soap_note) &&
      /O:|Objective:/i.test(enc.soap_note) &&
      /A:|Assessment:/i.test(enc.soap_note) &&
      /P:|Plan:/i.test(enc.soap_note);

    if (!hasProperSOAP || hasSOAPInTranscript) {
      if (enc.soap_note) {
        extraBackup.original_soap_note = enc.soap_note;
      }
      
      if (hasSOAPInTranscript) {
        // Extract SOAP from transcript and clean transcript
        updates.soap_note = extractSOAPFromTranscript(currentTranscript);
        updates.transcript = transformToConversational(
          currentTranscript.replace(/\b(S:|O:|A:|P:|Subjective:|Objective:|Assessment:|Plan:)[^]*?(?=\b(S:|O:|A:|P:|Subjective:|Objective:|Assessment:|Plan:)|$)/gi, ''),
          patientFirstName
        );
        console.log(`  📋 Extracted SOAP from transcript and cleaned transcript`);
      } else {
        // Generate SOAP from current content
        updates.soap_note = extractSOAPFromTranscript(currentTranscript);
        console.log(`  📋 Generated structured SOAP notes`);
      }
    }

    ////////////////////////////////////////////////////////////
    // Priority 4: Generate differential diagnoses
    const { data: existingDiffs } = await supabase
      .from('differential_diagnoses')
      .select('id')
      .eq('encounter_id', enc.id);

    if (!existingDiffs || existingDiffs.length === 0) {
      const reason = updates.reason_display_text || enc.reason_display_text || 'General consultation';
      const differentials = generateDifferentialDiagnoses(reason, patientName);
      
      const diffRows = differentials.map((diff, idx) => ({
        id: crypto.randomUUID(),
        patient_id: patientRow.id,
        encounter_id: enc.id,
        diagnosis_name: diff.name,
        likelihood: diff.likelihood,
        key_factors: `Clinical assessment based on ${reason.toLowerCase()}`,
        rank_order: idx + 1,
        extra_data: { autogenerated: true, generated_at: new Date().toISOString() }
      }));

      const { error: diffErr } = await supabase
        .from('differential_diagnoses')
        .insert(diffRows);

      if (diffErr) {
        console.error(`  ❌ Error inserting differentials:`, diffErr.message);
      } else {
        console.log(`  🩺 Generated ${differentials.length} differential diagnoses`);
      }
    }

    ////////////////////////////////////////////////////////////
    // Priority 5: Generate rich content
    if (!enc.diagnosis_rich_content || Object.keys(enc.diagnosis_rich_content).length === 0) {
      const reason = updates.reason_display_text || enc.reason_display_text || 'condition';
      updates.diagnosis_rich_content = {
        markdown: `### Clinical Assessment\n\nThe patient presents with **${reason}** requiring thorough evaluation.\n\n#### Key Findings\n- Chief complaint: ${reason}\n- Clinical evaluation in progress\n- Differential diagnoses considered\n\n#### Recommended Actions\n- Continue assessment\n- Monitor symptoms\n- Consider additional testing if indicated`,
        charts: [],
        tables: [{
          headers: ['Assessment Item', 'Status'],
          rows: [
            ['Chief Complaint', reason],
            ['Physical Exam', 'Completed'],
            ['Differential Dx', 'Generated']
          ]
        }]
      };
      console.log(`  ✨ Generated diagnosis rich content`);
    }

    if (!enc.treatments_rich_content || Object.keys(enc.treatments_rich_content).length === 0) {
      updates.treatments_rich_content = {
        markdown: `### Treatment Plan\n\n#### Immediate Actions\n1. **Symptomatic management** - Address current symptoms\n2. **Patient education** - Provide information about condition\n3. **Follow-up planning** - Schedule appropriate return visit\n\n#### Monitoring\n- Track symptom progression\n- Assess treatment response\n- Adjust plan as needed\n\n#### Next Steps\n- Return visit in 2-4 weeks\n- Contact if symptoms worsen\n- Continue current medications as prescribed`,
        decisionTrees: [{
          question: 'Are symptoms improving?',
          options: [
            { answer: 'Yes', action: 'Continue current treatment' },
            { answer: 'No', action: 'Consider alternative approaches' },
            { answer: 'Worsening', action: 'Urgent reassessment needed' }
          ]
        }]
      };
      console.log(`  💊 Generated treatments rich content`);
    }

    // Mark enrichment as completed
    extraBackup.enrichment_done = true;
    extraBackup.enrichment_timestamp = new Date().toISOString();
    extraBackup.enrichment_version = '1.0';
    updates.extra_data = extraBackup;

    // Apply updates if any exist
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('encounters')
        .update(updates)
        .eq('id', enc.id);

      if (updateError) {
        console.error(`  ❌ Failed to update encounter ${enc.encounter_id}:`, updateError.message);
      } else {
        updateCount++;
        console.log(`  ✅ Successfully updated encounter ${enc.encounter_id}`);
      }
    } else {
      console.log(`  ℹ️  No updates needed for encounter ${enc.encounter_id}`);
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Completed ${patientName}: ${updateCount}/${encounters.length} encounters updated`);
}

async function main() {
  console.log('🚀 Starting comprehensive patient enrichment process...');
  console.log(`📅 ${new Date().toISOString()}\n`);

  let totalPatients = 0;
  let successfulPatients = 0;

  for (const fullName of TARGET_PATIENT_NAMES) {
    totalPatients++;
    
    try {
      const { data: patients, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .ilike('name', `%${fullName}%`);

      if (pErr) throw pErr;

      if (!patients || patients.length === 0) {
        console.log(`⚠️  Patient not found: ${fullName}`);
        continue;
      }

      if (patients.length > 1) {
        console.log(`⚠️  Multiple patients found for "${fullName}". Using first match.`);
      }

      const patient = patients[0];
      await enrichPatient(patient);
      successfulPatients++;

      // Pause between patients
      console.log('\n⏳ Pausing before next patient...');
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`💥 Error processing ${fullName}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ENRICHMENT PROCESS COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Patients processed: ${successfulPatients}/${totalPatients}`);
  console.log(`✅ Process finished at: ${new Date().toISOString()}`);
  
  process.exit(0);
}

// Run the enrichment process
main().catch((err) => {
  console.error('💥 Fatal error during enrichment:', err.message);
  console.error(err.stack);
  process.exit(1);
});
