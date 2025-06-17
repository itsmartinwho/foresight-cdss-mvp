#!/usr/bin/env tsx

// Test script to check if the real alerts system is working
import { OpenAIClient, AIModelFactory } from '../src/lib/ai/gpt-models';
import { AI_MODEL_PRESETS, AIModel } from '../src/types/ai-models';

async function testOpenAIConnection() {
  console.log('🔧 Testing OpenAI Connection and Models...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  console.log('API Key available:', !!apiKey);
  console.log('API Key preview:', apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found');

  if (!apiKey) {
    console.error('❌ No OPENAI_API_KEY found in environment variables');
    return;
  }

  // Test real-time client
  console.log('\n📡 Testing Real-time Client (GPT-4O-Mini)...');
  try {
    const realtimeClient = new OpenAIClient(AI_MODEL_PRESETS.REAL_TIME_FAST, apiKey);
    const isValid = await realtimeClient.validateApiKey();
    console.log('✅ Real-time client API key valid:', isValid);
    
    const modelStatus = await realtimeClient.getModelStatus(AIModel.GPT_4O_MINI);
    console.log('📊 Model status:', modelStatus);
  } catch (error) {
    console.error('❌ Real-time client error:', error);
  }

  // Test post-consultation client
  console.log('\n📡 Testing Post-consultation Client (GPT-4O)...');
  try {
    const postClient = new OpenAIClient(AI_MODEL_PRESETS.POST_CONSULTATION_COMPREHENSIVE, apiKey);
    const isValid = await postClient.validateApiKey();
    console.log('✅ Post-consultation client API key valid:', isValid);
    
    const modelStatus = await postClient.getModelStatus(AIModel.GPT_4O);
    console.log('📊 Model status:', modelStatus);
  } catch (error) {
    console.error('❌ Post-consultation client error:', error);
  }

  console.log('\n🧪 Testing Alert Processing...');
  try {
    const client = new OpenAIClient(AI_MODEL_PRESETS.REAL_TIME_FAST, apiKey);
    
    // Simple mock processing request to test AI pipeline
    const testRequest = {
      model: AIModel.GPT_4O_MINI,
      context: {
        patientId: 'test-123',
        patientData: {
          demographics: { age: 45, gender: 'M' },
          conditions: [],
          medications: [{ name: 'methotrexate', dosage: '15mg weekly' }],
          labResults: [],
          allergies: []
        },
        transcript: {
          full: 'Patient reports taking methotrexate and mentions joint pain and fatigue.'
        },
        existingAlerts: []
      },
      promptTemplate: {
        id: 'test',
        name: 'Test',
        description: 'Test template',
        alertTypes: ['DRUG_INTERACTION', 'MONITORING'],
        systemPrompt: 'You are a medical alert system. Analyze the transcript for potential drug interactions or monitoring needs.',
        userPromptTemplate: 'Patient context: {PATIENT_CONTEXT}\nTranscript: {TRANSCRIPT}\nExisting alerts: {EXISTING_ALERTS}',
        requiredContext: ['transcript'],
        outputFormat: 'json' as const,
        confidenceThreshold: 0.7
      },
      isRealTime: true,
      confidenceThreshold: 0.7
    };

    const response = await client.processAlerts(testRequest);
    console.log('📈 Processing response:', {
      success: response.success,
      alertCount: response.alerts.length,
      processingTime: response.processingTime,
      tokensUsed: response.tokensUsed,
      error: response.error
    });

    if (response.alerts.length > 0) {
      console.log('🚨 Generated alerts:', response.alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        confidence: alert.confidence
      })));
    }

  } catch (error) {
    console.error('❌ Alert processing test failed:', error);
  }
}

// Run the test
testOpenAIConnection().catch(console.error); 