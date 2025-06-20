const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lmwbmckvlvzwftjwatxr.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd2JtY2t2bHZ6d2Z0andhdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzc0MTIsImV4cCI6MjA2MjY1MzQxMn0.vb8ox4rmreRTbZZ-KZVos-7veAZaSu-V6GU79GsLj24'
);

const TARGET_PATIENTS = [
  'Maria Gomez',
  'James Lee', 
  'Priya Patel',
  'Alice Smith'
];

// Analysis criteria functions
function analyzeRepeatedReasons(encounters) {
  const reasonCounts = {};
  const duplicates = [];
  
  encounters.forEach(enc => {
    const reason = enc.reason_display_text || '';
    if (reason.trim().length > 0) {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
  });
  
  Object.entries(reasonCounts).forEach(([reason, count]) => {
    if (count > 1) {
      const duplicateEncounters = encounters.filter(
        enc => enc.reason_display_text === reason
      );
      duplicates.push({
        reason,
        count,
        encounterIds: duplicateEncounters.map(e => e.id)
      });
    }
  });
  
  return {
    hasRepeatedReasons: duplicates.length > 0,
    duplicates,
    totalReasons: Object.keys(reasonCounts).length,
    totalEncounters: encounters.length
  };
}

function analyzeTranscriptFormat(encounters) {
  const issues = [];
  
  encounters.forEach(enc => {
    const transcript = enc.transcript || '';
    const trimmed = transcript.trim();
    
    // Check if it's conversational format
    const hasDocPatPattern = /doctor:|patient:/i.test(trimmed) || 
                           /dr\.|pt\./i.test(trimmed) ||
                           /physician:|clinician:/i.test(trimmed);
    
    // Check if it looks like SOAP notes instead
    const hasSOAPPattern = /\bS:|Subjective:|O:|Objective:|A:|Assessment:|P:|Plan:/i.test(trimmed);
    
    // Check length (stub detection)
    const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
    const isStub = trimmed.length < 120 || wordCount < 20;
    
    if (!hasDocPatPattern || hasSOAPPattern || isStub) {
      issues.push({
        encounterId: enc.id,
        reason: enc.reason_display_text,
        problems: {
          notConversational: !hasDocPatPattern,
          hasSOAPInTranscript: hasSOAPPattern,
          isStub: isStub,
          length: trimmed.length,
          wordCount: wordCount
        },
        transcriptPreview: trimmed.substring(0, 200) + (trimmed.length > 200 ? '...' : '')
      });
    }
  });
  
  return {
    needsTransformation: issues.length > 0,
    issueCount: issues.length,
    issues
  };
}

function analyzeSOAPNotes(encounters) {
  const issues = [];
  
  encounters.forEach(enc => {
    const soapNote = enc.soap_note || '';
    const transcript = enc.transcript || '';
    
    const analysis = {
      encounterId: enc.id,
      reason: enc.reason_display_text,
      hasSOAP: soapNote.trim().length > 0,
      soapInTranscript: false,
      properlyStructured: false,
      sections: {
        subjective: false,
        objective: false,
        assessment: false,
        plan: false
      }
    };
    
    // Check if SOAP content is in transcript instead
    const soapPatterns = [
      /\bS:|Subjective:/i,
      /\bO:|Objective:/i, 
      /\bA:|Assessment:/i,
      /\bP:|Plan:/i
    ];
    
    analysis.soapInTranscript = soapPatterns.some(pattern => pattern.test(transcript));
    
    if (analysis.hasSOAP) {
      // Check for proper sections
      analysis.sections.subjective = /S:|Subjective:/i.test(soapNote);
      analysis.sections.objective = /O:|Objective:/i.test(soapNote);
      analysis.sections.assessment = /A:|Assessment:/i.test(soapNote);
      analysis.sections.plan = /P:|Plan:/i.test(soapNote);
      
      analysis.properlyStructured = Object.values(analysis.sections).every(hasSection => hasSection);
      
      // Check if all content is bunched in one section
      if (analysis.sections.subjective && !analysis.sections.objective) {
        const subjectiveContent = soapNote.substring(
          soapNote.search(/S:|Subjective:/i),
          soapNote.search(/O:|Objective:/i) > -1 ? 
            soapNote.search(/O:|Objective:/i) : soapNote.length
        );
        if (subjectiveContent.length > soapNote.length * 0.8) {
          analysis.allInSubjective = true;
        }
      }
    }
    
    if (!analysis.hasSOAP || !analysis.properlyStructured || analysis.soapInTranscript) {
      issues.push(analysis);
    }
  });
  
  return {
    needsSOAPWork: issues.length > 0,
    issueCount: issues.length,
    issues
  };
}

async function analyzeDifferentials(encounters) {
  const issues = [];
  
  for (const enc of encounters) {
    // Check if encounter has differential diagnoses
    const { data: differentials } = await supabase
      .from('differential_diagnoses')
      .select('*')
      .eq('encounter_id', enc.id);
    
    if (!differentials || differentials.length === 0) {
      issues.push({
        encounterId: enc.id,
        reason: enc.reason_display_text,
        hasDifferentials: false,
        count: 0
      });
    } else {
      // Check quality of differentials
      const hasLikelihood = differentials.every(d => d.likelihood !== null);
      const hasRanking = differentials.every(d => d.rank_order !== null);
      
      if (!hasLikelihood || !hasRanking) {
        issues.push({
          encounterId: enc.id,
          reason: enc.reason_display_text,
          hasDifferentials: true,
          count: differentials.length,
          missingLikelihood: !hasLikelihood,
          missingRanking: !hasRanking
        });
      }
    }
  }
  
  return {
    needsDifferentials: issues.length > 0,
    issueCount: issues.length,
    issues
  };
}

function analyzeRichContent(encounters) {
  const issues = [];
  
  encounters.forEach(enc => {
    const hasDiagnosisRich = enc.diagnosis_rich_content && 
                           Object.keys(enc.diagnosis_rich_content).length > 0;
    const hasTreatmentsRich = enc.treatments_rich_content && 
                            Object.keys(enc.treatments_rich_content).length > 0;
    
    if (!hasDiagnosisRich || !hasTreatmentsRich) {
      issues.push({
        encounterId: enc.id,
        reason: enc.reason_display_text,
        missingDiagnosisRich: !hasDiagnosisRich,
        missingTreatmentsRich: !hasTreatmentsRich
      });
    }
  });
  
  return {
    needsRichContent: issues.length > 0,
    issueCount: issues.length,
    issues
  };
}

async function analyzePatient(patientName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYZING: ${patientName}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Find patient by name  
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .ilike('name', `%${patientName}%`);
    
    if (patientError) {
      console.error(`❌ Error finding patient ${patientName}:`, patientError.message);
      return null;
    }
    
    if (!patients || patients.length === 0) {
      console.log(`⚠️  Patient not found: ${patientName}`);
      return null;
    }
    
    if (patients.length > 1) {
      console.log(`⚠️  Multiple patients found for "${patientName}". Using first match.`);
      patients.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (ID: ${p.patient_id})`);
      });
    }
    
    const patient = patients[0];
    console.log(`✅ Found patient: ${patient.name} (ID: ${patient.patient_id})`);
    
    // Get all non-deleted encounters
    const { data: encounters, error: encounterError } = await supabase
      .from('encounters')
      .select('*')
      .eq('patient_supabase_id', patient.id)
      .eq('is_deleted', false)
      .order('scheduled_start_datetime');
    
    if (encounterError) {
      console.error(`❌ Error fetching encounters:`, encounterError.message);
      return null;
    }
    
    console.log(`\n📊 Found ${encounters.length} encounters`);
    
    if (encounters.length === 0) {
      console.log(`⚠️  No encounters found for ${patientName}`);
      return { patient, encounters: [], analysis: null };
    }
    
    // Perform all 5 analysis criteria
    console.log(`\n🔍 ANALYSIS RESULTS:`);
    
    // 1. Repeated reasons analysis
    const reasonsAnalysis = analyzeRepeatedReasons(encounters);
    console.log(`\n1️⃣  REPEATED REASONS:`);
    console.log(`   Status: ${reasonsAnalysis.hasRepeatedReasons ? '❌ NEEDS WORK' : '✅ OK'}`);
    console.log(`   Total unique reasons: ${reasonsAnalysis.totalReasons}/${reasonsAnalysis.totalEncounters}`);
    if (reasonsAnalysis.hasRepeatedReasons) {
      reasonsAnalysis.duplicates.forEach(dup => {
        console.log(`   🔁 "${dup.reason}" appears ${dup.count} times`);
      });
    }
    
    // 2. Transcript format analysis
    const transcriptAnalysis = analyzeTranscriptFormat(encounters);
    console.log(`\n2️⃣  TRANSCRIPT FORMAT:`);
    console.log(`   Status: ${transcriptAnalysis.needsTransformation ? '❌ NEEDS WORK' : '✅ OK'}`);
    console.log(`   Issues found: ${transcriptAnalysis.issueCount}/${encounters.length}`);
    if (transcriptAnalysis.needsTransformation) {
      transcriptAnalysis.issues.slice(0, 3).forEach(issue => {
        console.log(`   📝 Encounter ${issue.encounterId}:`);
        console.log(`      - Not conversational: ${issue.problems.notConversational}`);
        console.log(`      - Has SOAP in transcript: ${issue.problems.hasSOAPInTranscript}`);
        console.log(`      - Is stub: ${issue.problems.isStub} (${issue.problems.wordCount} words)`);
      });
      if (transcriptAnalysis.issues.length > 3) {
        console.log(`   ... and ${transcriptAnalysis.issues.length - 3} more`);
      }
    }
    
    // 3. SOAP notes analysis
    const soapAnalysis = analyzeSOAPNotes(encounters);
    console.log(`\n3️⃣  SOAP NOTES:`);
    console.log(`   Status: ${soapAnalysis.needsSOAPWork ? '❌ NEEDS WORK' : '✅ OK'}`);
    console.log(`   Issues found: ${soapAnalysis.issueCount}/${encounters.length}`);
    if (soapAnalysis.needsSOAPWork) {
      soapAnalysis.issues.slice(0, 3).forEach(issue => {
        console.log(`   📋 Encounter ${issue.encounterId}:`);
        console.log(`      - Has SOAP: ${issue.hasSOAP}`);
        console.log(`      - SOAP in transcript: ${issue.soapInTranscript}`);
        console.log(`      - Properly structured: ${issue.properlyStructured}`);
        if (issue.allInSubjective) {
          console.log(`      - All content in Subjective section: ⚠️`);
        }
      });
    }
    
    // 4. Differentials analysis
    const differentialsAnalysis = await analyzeDifferentials(encounters);
    console.log(`\n4️⃣  DIFFERENTIAL DIAGNOSES:`);
    console.log(`   Status: ${differentialsAnalysis.needsDifferentials ? '❌ NEEDS WORK' : '✅ OK'}`);
    console.log(`   Issues found: ${differentialsAnalysis.issueCount}/${encounters.length}`);
    if (differentialsAnalysis.needsDifferentials) {
      differentialsAnalysis.issues.slice(0, 3).forEach(issue => {
        console.log(`   🩺 Encounter ${issue.encounterId}:`);
        console.log(`      - Has differentials: ${issue.hasDifferentials} (${issue.count || 0})`);
        if (issue.missingLikelihood) console.log(`      - Missing likelihood scores`);
        if (issue.missingRanking) console.log(`      - Missing rank order`);
      });
    }
    
    // 5. Rich content analysis
    const richContentAnalysis = analyzeRichContent(encounters);
    console.log(`\n5️⃣  RICH CONTENT:`);
    console.log(`   Status: ${richContentAnalysis.needsRichContent ? '❌ NEEDS WORK' : '✅ OK'}`);
    console.log(`   Issues found: ${richContentAnalysis.issueCount}/${encounters.length}`);
    if (richContentAnalysis.needsRichContent) {
      richContentAnalysis.issues.slice(0, 3).forEach(issue => {
        console.log(`   🎨 Encounter ${issue.encounterId}:`);
        console.log(`      - Missing diagnosis rich content: ${issue.missingDiagnosisRich}`);
        console.log(`      - Missing treatments rich content: ${issue.missingTreatmentsRich}`);
      });
    }
    
    // Summary
    const totalIssues = [
      reasonsAnalysis.hasRepeatedReasons,
      transcriptAnalysis.needsTransformation,
      soapAnalysis.needsSOAPWork,
      differentialsAnalysis.needsDifferentials,
      richContentAnalysis.needsRichContent
    ].filter(Boolean).length;
    
    console.log(`\n📋 SUMMARY FOR ${patientName}:`);
    console.log(`   Issues found: ${totalIssues}/5 criteria need work`);
    console.log(`   Encounters needing enrichment: ${Math.max(
      reasonsAnalysis.duplicates.reduce((sum, dup) => sum + dup.count, 0),
      transcriptAnalysis.issueCount,
      soapAnalysis.issueCount,
      differentialsAnalysis.issueCount,
      richContentAnalysis.issueCount
    )}/${encounters.length}`);
    
    return {
      patient,
      encounters,
      analysis: {
        repeatedReasons: reasonsAnalysis,
        transcriptFormat: transcriptAnalysis,
        soapNotes: soapAnalysis,
        differentials: differentialsAnalysis,
        richContent: richContentAnalysis,
        totalIssues,
        needsEnrichment: totalIssues > 0
      }
    };
    
  } catch (error) {
    console.error(`❌ Unexpected error analyzing ${patientName}:`, error.message);
    return null;
  }
}

async function analyzeAllTargetPatients() {
  console.log(`🚀 Starting comprehensive analysis of target patients...`);
  console.log(`📅 ${new Date().toISOString()}`);
  
  const results = {};
  
  for (const patientName of TARGET_PATIENTS) {
    try {
      const result = await analyzePatient(patientName);
      results[patientName] = result;
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`💥 Failed to analyze ${patientName}:`, error.message);
      results[patientName] = { error: error.message };
    }
  }
  
  // Overall summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`OVERALL SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  
  const validResults = Object.entries(results).filter(([name, result]) => result && !result.error);
  const totalPatients = validResults.length;
  const patientsNeedingWork = validResults.filter(([name, result]) => result.analysis?.needsEnrichment).length;
  
  console.log(`\n📊 PATIENTS ANALYZED: ${totalPatients}/${TARGET_PATIENTS.length}`);
  console.log(`❌ PATIENTS NEEDING ENRICHMENT: ${patientsNeedingWork}/${totalPatients}`);
  
  validResults.forEach(([name, result]) => {
    if (result.analysis) {
      console.log(`\n🏥 ${name}:`);
      console.log(`   Encounters: ${result.encounters.length}`);
      console.log(`   Issues: ${result.analysis.totalIssues}/5`);
      console.log(`   Status: ${result.analysis.needsEnrichment ? '❌ Needs work' : '✅ Good'}`);
    }
  });
  
  console.log(`\n✅ Analysis complete!`);
  return results;
}

// Execute the analysis
analyzeAllTargetPatients().catch(console.error); 