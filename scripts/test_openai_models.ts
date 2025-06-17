#!/usr/bin/env tsx

/**
 * Test script to verify OpenAI model names and API connectivity
 * Tests the corrected model names: o4-mini-2025-04-16 and gpt-4.1-mini-2025-04-14
 */

import dotenv from 'dotenv';
import { getModelForUseCase, DEFAULT_REALTIME_MODEL, DEFAULT_POST_CONSULTATION_MODEL } from '../src/lib/ai/gpt-models';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface TestResult {
  model: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  usage?: any;
}

async function testOpenAIModel(model: string, testType: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 Testing ${testType} model: ${model}`);
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }

    // Use appropriate parameters based on model
    const requestBody: any = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a clinical AI assistant. Respond with a simple JSON object containing a test message.'
        },
        {
          role: 'user',
          content: 'Test message: Please respond with {"status": "success", "message": "Model is working correctly"}'
        }
      ]
    };

    // o4-mini models have specific parameter requirements
    if (model.includes('o4-mini')) {
      requestBody.max_completion_tokens = 100;
      // o4-mini only supports default temperature (1), don't set temperature parameter
    } else {
      requestBody.max_tokens = 100;
      requestBody.temperature = 0.1;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`✅ Success! Response time: ${responseTime}ms`);
    console.log(`📊 Usage: ${JSON.stringify(data.usage, null, 2)}`);
    console.log(`📝 Response: ${data.choices[0].message.content}`);

    return {
      model,
      success: true,
      responseTime,
      usage: data.usage
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Failed after ${responseTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      model,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

async function testModelSelection() {
  console.log('\n🔧 Testing model selection logic...');
  
  const realTimeModel = getModelForUseCase('real-time');
  const postConsultationModel = getModelForUseCase('post-consultation');
  const demoModel = getModelForUseCase('demo');
  
  console.log(`Real-time model: ${realTimeModel}`);
  console.log(`Post-consultation model: ${postConsultationModel}`);
  console.log(`Demo model: ${demoModel}`);
  
  console.log(`Default real-time: ${DEFAULT_REALTIME_MODEL}`);
  console.log(`Default post-consultation: ${DEFAULT_POST_CONSULTATION_MODEL}`);
}

async function main() {
  console.log('🚀 OpenAI Model Testing Script');
  console.log('================================');

  // Test model selection logic
  testModelSelection();

  // Test the corrected model names
  const testResults: TestResult[] = [];

  // Test real-time model (gpt-4.1-mini-2025-04-14)
  const realTimeModel = getModelForUseCase('real-time');
  const realTimeResult = await testOpenAIModel(realTimeModel, 'Real-time');
  testResults.push(realTimeResult);

  // Test post-consultation model (o4-mini-2025-04-16)
  const postConsultationModel = getModelForUseCase('post-consultation');
  const postConsultationResult = await testOpenAIModel(postConsultationModel, 'Post-consultation');
  testResults.push(postConsultationResult);

  // Test demo model (gpt-4o-mini)
  const demoModel = getModelForUseCase('demo');
  const demoResult = await testOpenAIModel(demoModel, 'Demo');
  testResults.push(demoResult);

  // Summary
  console.log('\n📋 Test Summary');
  console.log('================');
  
  const successful = testResults.filter(r => r.success);
  const failed = testResults.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${testResults.length}`);
  console.log(`❌ Failed: ${failed.length}/${testResults.length}`);
  
  if (failed.length > 0) {
    console.log('\n🚨 Failed Tests:');
    failed.forEach(result => {
      console.log(`  - ${result.model}: ${result.error}`);
    });
  }
  
  if (successful.length > 0) {
    console.log('\n🎉 Successful Tests:');
    successful.forEach(result => {
      console.log(`  - ${result.model}: ${result.responseTime}ms`);
    });
  }

  // Check if critical models are working
  const realTimeWorking = testResults.find(r => r.model === realTimeModel)?.success;
  const postConsultationWorking = testResults.find(r => r.model === postConsultationModel)?.success;
  
  if (realTimeWorking && postConsultationWorking) {
    console.log('\n🎯 RESULT: Both critical models are working! The alerts system should now function correctly.');
  } else {
    console.log('\n⚠️  RESULT: Some critical models are not working. Check API key and model names.');
  }
}

main().catch(console.error); 