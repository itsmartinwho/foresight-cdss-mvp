#!/usr/bin/env tsx

/**
 * Guidelines System Test Script
 * 
 * This script tests the clinical guidelines system without requiring
 * a full Supabase database setup. It validates:
 * - USPSTF and RxNorm data ingestion
 * - Search functionality 
 * - Advisor integration
 * 
 * Usage: tsx scripts/clinical-guidelines/test-guidelines.ts
 */

import { runGuidelinesTests } from '../../src/services/guidelines/test-harness';

async function main() {
  console.log('=' .repeat(60));
  console.log('🧪 CLINICAL GUIDELINES SYSTEM TEST');
  console.log('=' .repeat(60));
  console.log('Testing the clinical guidelines integration without database setup');
  console.log('This validates ingestion, search, and advisor integration logic\n');

  try {
    await runGuidelinesTests();
  } catch (error) {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  }
}

main(); 