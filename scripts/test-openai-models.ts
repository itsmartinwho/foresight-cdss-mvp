import OpenAI from 'openai';

async function testOpenAIModels() {
  console.log('=== Testing OpenAI Model Names ===\n');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  // Test GPT-4.1-mini (for differential diagnosis)
  try {
    console.log('Testing gpt-4.1-mini model...');
    const gpt41MiniResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a medical assistant. Return only valid JSON." },
        { 
          role: "user", 
          content: `Return a JSON array with one differential diagnosis for fever and cough:
[{"name": "Upper respiratory infection", "likelihood": "High", "keyFactors": "Common viral symptoms"}]` 
        }
      ],
      temperature: 1,
      max_tokens: 200,
    });
    console.log('✅ gpt-4.1-mini is working!');
    console.log('Response:', gpt41MiniResponse.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ gpt-4.1-mini failed:', error);
    return false;
  }

  // Test o4-mini (for primary diagnosis)
  try {
    console.log('\nTesting o4-mini model...');
    const o4MiniResponse = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        { role: "system", content: "You are a medical assistant. Return only valid JSON." },
        { 
          role: "user", 
          content: `Return JSON for a diagnosis:
{"diagnosisName": "Viral upper respiratory infection", "diagnosisCode": "J06.9", "confidence": 0.8, "supportingEvidence": ["Fever", "Cough"], "recommendedTests": [], "recommendedTreatments": ["Rest", "Fluids"], "clinicalTrialMatches": []}` 
        }
      ],
      temperature: 1,
      max_completion_tokens: 300,
    });
    console.log('✅ o4-mini is working!');
    console.log('Response:', o4MiniResponse.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ o4-mini failed:', error);
    return false;
  }

  return true;
}

// Run the test
testOpenAIModels()
  .then(success => {
    if (success) {
      console.log('\n🎉 All OpenAI models are working correctly!');
      console.log('The Clinical Engine V3 should now work properly.');
      process.exit(0);
    } else {
      console.log('\n💥 OpenAI model tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }); 