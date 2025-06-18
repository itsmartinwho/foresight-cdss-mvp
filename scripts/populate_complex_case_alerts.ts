#!/usr/bin/env tsx

/**
 * Script to populate the database with complex case alerts
 * This restores the missing complex case alerts for autoimmune conditions, cancer, etc.
 */

import { generateComplexCaseAlerts } from './generate_demo_clinical_results';

async function main() {
  console.log('🚀 Starting complex case alerts population...');
  
  try {
    await generateComplexCaseAlerts();
    console.log('✅ Complex case alerts population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating complex case alerts:', error);
    process.exit(1);
  }
}

main(); 