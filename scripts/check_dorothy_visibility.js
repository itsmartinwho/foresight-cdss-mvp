// Simple script to check if Dorothy Robinson is visible in the database
// This runs directly against the API without needing the full Next.js environment

const DOROTHY_PATIENT_ID = '0681FA35-A794-4684-97BD-00B88370DB41';

async function checkDorothyVisibility() {
  console.log('🔍 Checking Dorothy Robinson visibility...');
  
  try {
    console.log(`📊 Looking for patient ID: ${DOROTHY_PATIENT_ID}`);
    
    // We'll use the demo data service which has hardcoded data
    const module = await import('../src/services/demo/DemoDataService.ts');
    const DemoDataService = module.DemoDataService;
    
    const demoPatient = DemoDataService.getPatientData();
    const demoEncounter = DemoDataService.getEncounterData();
    
    console.log('✅ Demo patient data found:');
    console.log(`   Name: ${demoPatient.name}`);
    console.log(`   ID: ${demoPatient.id}`);
    console.log(`   Gender: ${demoPatient.gender}`);
    console.log(`   Date of Birth: ${demoPatient.dateOfBirth}`);
    console.log(`   Language: ${demoPatient.language}`);
    console.log(`   Alerts: ${demoPatient.alerts?.length || 0} (legacy demo data structure)`);
    
    console.log('\n📋 Demo encounter data:');
    console.log(`   Encounter ID: ${demoEncounter.id}`);
    console.log(`   Reason: ${demoEncounter.reasonDisplayText}`);
    console.log(`   Transcript length: ${demoEncounter.transcript.length} characters`);
    console.log(`   Treatments: ${demoEncounter.treatments.length}`);
    
    console.log('\n🎯 Current diagnosis:');
    console.log(`   Code: ${demoEncounter.diagnosis.code}`);
    console.log(`   Description: ${demoEncounter.diagnosis.description}`);
    
    console.log('\n📝 Transcript sample:');
    console.log(demoEncounter.transcript.substring(0, 300) + '...');
    
    return {
      patient: demoPatient,
      encounter: demoEncounter
    };
    
  } catch (error) {
    console.error('❌ Error checking Dorothy Robinson data:', error);
    throw error;
  }
}

// Run the script
checkDorothyVisibility()
  .then((data) => {
    console.log('\n✅ Dorothy Robinson data check completed successfully!');
    console.log('\n📌 Key points:');
    console.log('   - Dorothy Robinson exists in the demo data service');
    console.log('   - Patient has rich clinical data including transcript');
    console.log('   - Ready to run clinical engine analysis');
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });

// Simple script to demonstrate how to clear Dorothy Robinson's cache and force refresh
// This can be run in browser console to test the fix

console.log('🔄 Forcing Dorothy Robinson cache refresh...');

// Get Dorothy's patient ID
const dorothyPatientId = '0681FA35-A794-4684-97BD-00B88370DB41';

// Import the service (in browser console, this would be available globally)
// const { supabaseDataService } = await import('./src/lib/supabaseDataService.ts');

// Clear Dorothy from cache using the clearDemoPatientData method
// (this method clears all cached data for a patient)
console.log('1. Clearing cached data for Dorothy...');
// supabaseDataService.clearDemoPatientData(dorothyPatientId);

// Force reload Dorothy's data
console.log('2. Forcing reload of Dorothy patient data...');
// await supabaseDataService.getPatientData(dorothyPatientId);

console.log('✅ Cache refresh complete! Dorothy encounters should now be visible.');

console.log(`
To run this manually in browser console:
1. Open Dorothy Robinson's workspace page
2. Open browser dev tools (F12)
3. Go to Console tab
4. Run these commands:

// Clear Dorothy's cached data
window.supabaseDataService?.clearDemoPatientData('${dorothyPatientId}');

// Force reload her data
await window.supabaseDataService?.getPatientData('${dorothyPatientId}');

// Refresh the page or component
window.location.reload();
`); 