const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testClinicalEngineAPI() {
  console.log('🧪 Testing clinical engine API...');
  
  // Test data - using a real patient structure from our enrichment work
  const testPayload = {
    patientId: 'PAT_0100001', // Maria Gomez from our enrichment work
    encounterId: 'enc_PAT_0100001_001',  // A test encounter ID
    transcript: `Clinician: Good morning, Maria. What brings you in today?
Maria: I've been experiencing persistent headaches over the last two weeks, along with some nausea.
Clinician: On a scale of 1 to 10, how severe are the headaches?
Maria: Around a 6. They tend to worsen in the afternoon.
Clinician: Any visual disturbances, like blurred vision or aura?
Maria: Occasionally some blurred vision when the pain peaks.
Clinician: Do you have any history of migraines or chronic headaches?
Maria: No, this is new for me.
Clinician: Have you taken any medication that helps?
Maria: Over-the-counter ibuprofen helps a bit, but the pain returns.
Clinician: Understood. Let's perform a physical exam and consider neuro-imaging if necessary.`
  };

  try {
    console.log('📡 Calling clinical engine API...');
    console.log('🎯 Patient ID:', testPayload.patientId);
    console.log('🎯 Encounter ID:', testPayload.encounterId);
    
    const response = await fetch('http://localhost:3000/api/clinical-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response status text:', response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ API Response received');
    console.log('📋 Response keys:', Object.keys(result));
    
    if (result.success) {
      console.log('🎉 Clinical engine processing completed successfully!');
      console.log('📝 Diagnosis:', result.result?.diagnosis || 'Not provided');
      console.log('💊 Treatments:', result.result?.treatments?.length || 0, 'treatments');
      if (result.result?.richContent) {
        console.log('✨ Rich content generated:', !!result.result.richContent.diagnosis, 'diagnosis,', !!result.result.richContent.treatments, 'treatments');
      }
    } else {
      console.log('⚠️  API returned success: false');
      console.log('📄 Full response:', JSON.stringify(result, null, 2));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing clinical engine API approach...');
  
  // Wait a moment for the dev server to start
  console.log('⏳ Waiting for dev server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const success = await testClinicalEngineAPI();
  
  if (success) {
    console.log('\n✅ API approach is working! Ready to process real patients.');
  } else {
    console.log('\n❌ API approach failed. Need to debug further.');
  }
}

main().catch(console.error); 