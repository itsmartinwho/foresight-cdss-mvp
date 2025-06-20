# Patient Data Enrichment Implementation Guide

## Detection Algorithms

### 1. Stub Encounter Detection

```javascript
function isStubEncounter(encounter) {
  const transcript = encounter.transcript || '';
  const trimmed = transcript.trim();
  
  // Check character count and word count
  const charCount = trimmed.length;
  const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
  
  return charCount < 120 || wordCount < 20;
}
```

### 2. Duplicate Reason Detection (Maria Gomez Specific)

```javascript
function findDuplicateReasons(encounters) {
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
        encounters: duplicateEncounters
      });
    }
  });
  
  return duplicates;
}
```

### 3. SOAP Structure Analysis

```javascript
function analyzeSOAPStructure(encounter) {
  const soapNote = encounter.soap_note || '';
  const transcript = encounter.transcript || '';
  
  const issues = {
    missingSOAP: !soapNote || soapNote.trim().length === 0,
    malformedSOAP: false,
    soapInTranscript: false,
    improperSections: []
  };
  
  // Check if transcript contains SOAP-like content
  const soapPatterns = [
    /\bS:|Subjective:/i,
    /\bO:|Objective:/i, 
    /\bA:|Assessment:/i,
    /\bP:|Plan:/i
  ];
  
  issues.soapInTranscript = soapPatterns.some(pattern => 
    pattern.test(transcript)
  );
  
  if (soapNote) {
    // Check for proper SOAP sections
    const sections = {
      subjective: /S:|Subjective:/i.test(soapNote),
      objective: /O:|Objective:/i.test(soapNote),
      assessment: /A:|Assessment:/i.test(soapNote),
      plan: /P:|Plan:/i.test(soapNote)
    };
    
    // Check if all content is in one section (malformed)
    const sectionLines = soapNote.split('\n').filter(line => line.trim());
    const subjectiveContent = soapNote.substring(
      soapNote.search(/S:|Subjective:/i),
      soapNote.search(/O:|Objective:/i) > -1 ? 
        soapNote.search(/O:|Objective:/i) : soapNote.length
    );
    
    if (subjectiveContent.length > soapNote.length * 0.8) {
      issues.malformedSOAP = true;
      issues.improperSections.push('All content in Subjective section');
    }
    
    // Check for missing sections
    Object.entries(sections).forEach(([section, present]) => {
      if (!present) {
        issues.improperSections.push(`Missing ${section} section`);
      }
    });
  }
  
  return issues;
}
```

### 4. Content Quality Assessment

```javascript
function assessContentQuality(encounter) {
  const quality = {
    transcriptQuality: 'good',
    soapQuality: 'good', 
    treatmentsQuality: 'good',
    observationsQuality: 'good',
    overallScore: 0,
    issues: []
  };
  
  // Assess transcript
  if (isStubEncounter(encounter)) {
    quality.transcriptQuality = 'poor';
    quality.issues.push('Stub transcript');
  }
  
  // Assess SOAP
  const soapIssues = analyzeSOAPStructure(encounter);
  if (soapIssues.missingSOAP || soapIssues.malformedSOAP) {
    quality.soapQuality = 'poor';
    quality.issues.push(...soapIssues.improperSections);
  }
  
  // Assess treatments
  const treatments = encounter.treatments;
  if (!treatments || 
      (Array.isArray(treatments) && treatments.length === 0) ||
      (typeof treatments === 'string' && treatments.trim() === '')) {
    quality.treatmentsQuality = 'poor';
    quality.issues.push('Missing treatments');
  }
  
  // Assess observations
  const observations = encounter.observations;
  if (!observations || 
      (Array.isArray(observations) && observations.length === 0)) {
    quality.observationsQuality = 'poor';
    quality.issues.push('Missing observations');
  }
  
  // Calculate overall score
  const scores = {
    good: 100,
    fair: 60,
    poor: 0
  };
  
  const avgScore = [
    scores[quality.transcriptQuality],
    scores[quality.soapQuality],
    scores[quality.treatmentsQuality],
    scores[quality.observationsQuality]
  ].reduce((sum, score) => sum + score, 0) / 4;
  
  quality.overallScore = avgScore;
  
  return quality;
}
```

## Enrichment Strategies

### 1. Reason Diversification for Maria Gomez

```javascript
function generateUniqueReason(encounter, patientDemographics, existingReasons) {
  const encounterDate = new Date(encounter.scheduled_start_datetime);
  const month = encounterDate.getMonth(); // 0-11
  const encounterType = encounter.encounter_type;
  
  // Seasonal patterns
  const seasonalReasons = {
    winter: [
      'Upper respiratory infection',
      'Influenza-like symptoms',
      'Seasonal depression screening',
      'Vitamin D deficiency follow-up'
    ],
    spring: [
      'Allergy management',
      'Annual wellness visit',
      'Allergy medication review',
      'Seasonal allergic rhinitis'
    ],
    summer: [
      'Heat-related illness prevention',
      'Travel medicine consultation',
      'Skin cancer screening',
      'Dehydration prevention counseling'
    ],
    fall: [
      'Flu vaccination',
      'Back-to-school physical',
      'Diabetes management review',
      'Hypertension follow-up'
    ]
  };
  
  // Age-based patterns
  const ageBasedReasons = {
    '20-39': [
      'Contraception counseling',
      'Routine gynecologic exam',
      'Stress management consultation',
      'Work-related injury evaluation'
    ],
    '40-59': [
      'Mammogram follow-up',
      'Cholesterol screening',
      'Osteoporosis prevention',
      'Menopause management'
    ],
    '60+': [
      'Chronic disease management',
      'Medication reconciliation',
      'Fall risk assessment',
      'Cognitive assessment'
    ]
  };
  
  // Encounter type patterns
  const typeBasedReasons = {
    outpatient: [
      'Routine follow-up',
      'Medication refill',
      'Lab result review',
      'Symptom evaluation'
    ],
    emergency: [
      'Acute chest pain',
      'Shortness of breath',
      'Severe headache',
      'Abdominal pain'
    ],
    inpatient: [
      'Post-surgical follow-up',
      'Chronic condition exacerbation',
      'Medication adjustment',
      'Discharge planning'
    ]
  };
  
  // Combine reason pools
  const season = getSeason(month);
  const ageGroup = getAgeGroup(patientDemographics.age);
  
  const candidateReasons = [
    ...seasonalReasons[season] || [],
    ...ageBasedReasons[ageGroup] || [],
    ...typeBasedReasons[encounterType] || []
  ];
  
  // Filter out already used reasons
  const availableReasons = candidateReasons.filter(
    reason => !existingReasons.includes(reason)
  );
  
  // If all reasons used, add variation
  if (availableReasons.length === 0) {
    const baseReason = candidateReasons[
      Math.floor(Math.random() * candidateReasons.length)
    ];
    return `${baseReason} - follow-up visit`;
  }
  
  return availableReasons[
    Math.floor(Math.random() * availableReasons.length)
  ];
}

function getSeason(month) {
  if (month >= 11 || month <= 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  return 'fall';
}

function getAgeGroup(age) {
  if (age < 40) return '20-39';
  if (age < 60) return '40-59';
  return '60+';
}
```

### 2. SOAP Content Extraction and Restructuring

```javascript
function extractAndRestructureSOAP(encounter) {
  const transcript = encounter.transcript || '';
  const existingSOAP = encounter.soap_note || '';
  
  // Extract SOAP content from transcript
  const soapMatches = {
    subjective: extractSection(transcript, /S:|Subjective:(.*?)(?=O:|Objective:|A:|Assessment:|P:|Plan:|$)/is),
    objective: extractSection(transcript, /O:|Objective:(.*?)(?=A:|Assessment:|P:|Plan:|$)/is),
    assessment: extractSection(transcript, /A:|Assessment:(.*?)(?=P:|Plan:|$)/is),
    plan: extractSection(transcript, /P:|Plan:(.*?)$/is)
  };
  
  // Clean transcript by removing SOAP content
  let cleanTranscript = transcript;
  Object.values(soapMatches).forEach(match => {
    if (match) {
      cleanTranscript = cleanTranscript.replace(match.fullMatch, '');
    }
  });
  
  // Build proper SOAP structure
  const structuredSOAP = buildSOAPStructure({
    subjective: soapMatches.subjective?.content || extractSubjectiveFromSOAP(existingSOAP),
    objective: soapMatches.objective?.content || generateObjectiveSection(encounter),
    assessment: soapMatches.assessment?.content || generateAssessmentSection(encounter),
    plan: soapMatches.plan?.content || generatePlanSection(encounter)
  });
  
  return {
    cleanTranscript: cleanTranscript.trim(),
    structuredSOAP
  };
}

function extractSection(text, regex) {
  const match = text.match(regex);
  if (match) {
    return {
      fullMatch: match[0],
      content: match[1]?.trim() || ''
    };
  }
  return null;
}

function buildSOAPStructure(sections) {
  return `S: ${sections.subjective}

O: ${sections.objective}

A: ${sections.assessment}

P: ${sections.plan}`;
}
```

### 3. Treatment Generation

```javascript
function generateTreatments(encounter, assessment) {
  const treatments = [];
  
  // Parse assessment for conditions
  const conditions = extractConditionsFromAssessment(assessment);
  
  conditions.forEach(condition => {
    const treatmentOptions = getTreatmentOptions(condition);
    treatments.push(...treatmentOptions);
  });
  
  // Add general recommendations
  treatments.push({
    treatment_type: 'patient_education',
    treatment_name: 'Follow-up instructions',
    instructions: 'Return if symptoms worsen or do not improve within expected timeframe',
    prescribed_date: new Date().toISOString().split('T')[0]
  });
  
  return treatments;
}

function getTreatmentOptions(condition) {
  const treatmentMap = {
    'hypertension': [
      {
        treatment_type: 'medication',
        treatment_name: 'Lisinopril',
        dosage: '10mg',
        route: 'PO',
        frequency: 'daily',
        prescribed_date: new Date().toISOString().split('T')[0],
        instructions: 'Take with or without food'
      },
      {
        treatment_type: 'lifestyle',
        treatment_name: 'DASH diet',
        instructions: 'Reduce sodium intake to <2300mg/day, increase fruits and vegetables'
      }
    ],
    'diabetes': [
      {
        treatment_type: 'medication',
        treatment_name: 'Metformin',
        dosage: '500mg',
        route: 'PO',
        frequency: 'twice daily',
        prescribed_date: new Date().toISOString().split('T')[0],
        instructions: 'Take with meals to reduce GI upset'
      },
      {
        treatment_type: 'monitoring',
        treatment_name: 'Blood glucose monitoring',
        instructions: 'Check fasting glucose daily, log results'
      }
    ]
    // Add more condition-treatment mappings
  };
  
  return treatmentMap[condition.toLowerCase()] || [];
}
```

## Implementation Workflow

### Main Enrichment Function

```javascript
async function enrichPatientData(patientName) {
  try {
    console.log(`Starting enrichment for ${patientName}`);
    
    // Step 1: Validate patient
    const patient = await validateTargetPatient(patientName);
    if (!patient) {
      console.log(`Skipping ${patientName} - not in target list or not found`);
      return;
    }
    
    // Step 2: Load encounters
    const encounters = await loadPatientEncounters(patient.id);
    console.log(`Found ${encounters.length} encounters for ${patientName}`);
    
    // Step 3: Assess and enrich each encounter
    const enrichmentResults = [];
    
    for (const encounter of encounters) {
      // Skip soft deleted encounters
      if (encounter.is_deleted) {
        console.log(`Skipping deleted encounter ${encounter.id}`);
        continue;
      }
      
      // Assess content quality
      const quality = assessContentQuality(encounter);
      console.log(`Encounter ${encounter.id} quality score: ${quality.overallScore}`);
      
      if (quality.overallScore < 70) { // Needs enrichment
        const enrichmentPlan = createEnrichmentPlan(encounter, quality, patient);
        const enrichedContent = await executeEnrichmentPlan(enrichmentPlan);
        
        // Update encounter in database
        await updateEncounter(encounter.id, enrichedContent);
        
        enrichmentResults.push({
          encounterId: encounter.id,
          plan: enrichmentPlan,
          success: true
        });
      }
    }
    
    console.log(`Enrichment completed for ${patientName}. Updated ${enrichmentResults.length} encounters.`);
    return enrichmentResults;
    
  } catch (error) {
    console.error(`Enrichment failed for ${patientName}:`, error);
    throw error;
  }
}

async function validateTargetPatient(patientName) {
  const targetPatients = ['Maria Gomez', 'James Lee', 'Priya Patel', 'Alice Smith'];
  
  if (!targetPatients.includes(patientName)) {
    return null;
  }
  
  const [firstName, lastName] = patientName.split(' ');
  
  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('first_name', firstName)
    .eq('last_name', lastName);
  
  return patients?.[0] || null;
}

function createEnrichmentPlan(encounter, quality, patient) {
  const plan = {
    encounterId: encounter.id,
    actions: []
  };
  
  // Add specific actions based on quality issues
  quality.issues.forEach(issue => {
    switch (issue) {
      case 'Stub transcript':
        plan.actions.push({
          type: 'ENRICH_TRANSCRIPT',
          priority: 'high'
        });
        break;
      case 'Missing treatments':
        plan.actions.push({
          type: 'GENERATE_TREATMENTS',
          priority: 'high'
        });
        break;
      case 'Missing observations':
        plan.actions.push({
          type: 'GENERATE_OBSERVATIONS',
          priority: 'medium'
        });
        break;
      // Add more case handlers
    }
  });
  
  // Add patient-specific actions
  if (patient.first_name === 'Maria' && patient.last_name === 'Gomez') {
    plan.actions.push({
      type: 'DIVERSIFY_REASON',
      priority: 'high'
    });
  }
  
  if (patient.first_name === 'Priya' && patient.last_name === 'Patel') {
    plan.actions.push({
      type: 'FIX_SOAP_STRUCTURE',
      priority: 'high'
    });
  }
  
  return plan;
}
```

This implementation guide provides the specific algorithms and code patterns needed to detect and fix the enrichment issues you described. The next step would be to implement the actual enrichment logic that uses these detection functions to improve the patient data quality. 