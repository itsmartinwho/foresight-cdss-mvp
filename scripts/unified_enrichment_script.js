#!/usr/bin/env node
/**
 * Unified script for analyzing and enriching target patient data.
 * Combines analysis, enrichment, and individual processing capabilities.
 *
 * USAGE:
 * - Analyze all patients: `node scripts/unified_enrichment_script.js --analyze`
 * - Enrich all patients: `node scripts/unified_enrichment_script.js --enrich`
 * - Analyze one patient: `node scripts/unified_enrichment_script.js --analyze --patient="Maria Gomez"`
 * - Enrich one patient: `node scripts/unified_enrichment_script.js --enrich --patient="Maria Gomez"`
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://lmwbmckvlvzwftjwatxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd2JtY2t2bHZ6d2Z0andhdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzc0MTIsImV4cCI6MjA2MjY1MzQxMn0.vb8ox4rmreRTbZZ-KZVos-7veAZaSu-V6GU79GsLj24';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ALL_TARGET_PATIENTS = ['Maria Gomez', 'James Lee', 'Priya Patel', 'Alice Smith'];

// ... (All helper functions from enrich_target_patients.js go here)

async function main() {
  const args = process.argv.slice(2);
  const analyzeOnly = args.includes('--analyze');
  const enrich = args.includes('--enrich');
  const patientArg = args.find(arg => arg.startsWith('--patient='));
  
  if (!analyzeOnly && !enrich) {
    console.log('Usage: node scripts/unified_enrichment_script.js [--analyze | --enrich] [--patient="Patient Name"]');
    process.exit(1);
  }
  
  let targetPatients = ALL_TARGET_PATIENTS;
  if (patientArg) {
    const patientName = patientArg.split('=')[1].replace(/"/g, '');
    if (ALL_TARGET_PATIENTS.includes(patientName)) {
      targetPatients = [patientName];
    } else {
      console.error(`Error: Patient "${patientName}" is not in the target list.`);
      process.exit(1);
    }
  }

  console.log(`🚀 Starting patient data ${analyzeOnly ? 'analysis' : 'enrichment'}...`);
  console.log(`🎯 Targets: ${targetPatients.join(', ')}`);

  for (const patientName of targetPatients) {
    if (analyzeOnly) {
      // Logic from analyze_target_patients.js
      // ...
    } else if (enrich) {
      // Logic from enrich_target_patients.js
      // ...
    }
  }

  console.log('✅ Process complete.');
}

main().catch(console.error);