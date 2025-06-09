#!/usr/bin/env tsx

import { getScheduler } from '../../src/services/guidelines/scheduler';

async function testScheduler() {
  console.log('🔄 Testing Clinical Guidelines Scheduler...\n');

  try {
    const scheduler = getScheduler();

    // Step 1: Set up monthly refresh
    console.log('📅 Step 1: Setting up monthly refresh schedule...');
    await scheduler.setupMonthlyRefresh();
    console.log('✅ Monthly refresh schedule configured\n');

    // Step 2: Check schedule status
    console.log('📊 Step 2: Checking schedule status...');
    const status = await scheduler.getScheduleStatus();
    console.log(`  Next run: ${status.nextRun.toLocaleString()}`);
    console.log(`  Last run: ${status.lastRun ? status.lastRun.toLocaleString() : 'Never'}`);
    console.log(`  Is due: ${status.isDue ? '✅ Yes' : '❌ No'}`);
    console.log(`  Is running: ${status.isRunning ? '🏃 Yes' : '⏸️ No'}\n`);

    // Step 3: Test manual refresh trigger (small subset)
    console.log('🚀 Step 3: Testing manual refresh trigger...');
    console.log('Triggering refresh for NICE guidelines only...');
    
    // Trigger async (don't wait for completion as it takes time)
    scheduler.triggerManualRefresh(['NICE'])
      .then(() => console.log('✅ Manual refresh completed'))
      .catch(error => console.error('❌ Manual refresh failed:', error));
    
    console.log('📤 Manual refresh triggered (running in background)\n');

    // Step 4: Check if refresh is due
    console.log('🕒 Step 4: Checking if refresh is due...');
    const isDue = await scheduler.isRefreshDue();
    console.log(`  Refresh due: ${isDue ? '✅ Yes' : '❌ No'}\n`);

    console.log('✅ Scheduler Test Complete!');
    console.log('\nScheduler Features:');
    console.log('✓ Monthly refresh scheduling');
    console.log('✓ Manual refresh triggering');
    console.log('✓ Schedule status monitoring');
    console.log('✓ Due date checking');
    console.log('✓ Background processing');
    console.log('✓ Error handling and logging');

    console.log('\nAPI Endpoints:');
    console.log('- GET /api/guidelines/schedule - Get schedule status');
    console.log('- POST /api/guidelines/schedule {"action": "setup"} - Configure schedule');
    console.log('- POST /api/guidelines/schedule {"action": "trigger"} - Manual refresh');
    console.log('- POST /api/guidelines/schedule {"action": "trigger", "sources": ["NICE"]} - Refresh specific sources');

  } catch (error) {
    console.error('❌ Scheduler test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testScheduler();
}

export { testScheduler }; 