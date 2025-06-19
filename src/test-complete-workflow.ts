// Comprehensive End-to-End Test for Structured Treatment Plans Workflow
import { DemoDataService } from './services/demo/DemoDataService';

interface WorkflowTestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: any;
  errors?: string[];
}

async function runCompleteWorkflowTest(): Promise<WorkflowTestResult[]> {
  console.log('🚀 Starting Complete Workflow End-to-End Test');
  console.log('='.repeat(60));
  
  const results: WorkflowTestResult[] = [];
  
  // Test 1: Database Schema Compatibility
  const test1Start = performance.now();
  try {
    console.log('\n📊 Test 1: Database Schema and Types Validation...');
    
    const demoTreatment = DemoDataService.getDemoRichTreatmentContent();
    const demoDiagnosis = DemoDataService.getDemoRichDiagnosisContent();
    
    // Validate type structure
    const treatmentValidation = {
      hasContentType: !!demoTreatment.content_type,
      hasTextContent: !!demoTreatment.text_content,
      hasRichElements: Array.isArray(demoTreatment.rich_elements),
      hasTimestamp: !!demoTreatment.created_at,
      hasVersion: !!demoTreatment.version
    };
    
    const diagnosisValidation = {
      hasContentType: !!demoDiagnosis.content_type,
      hasTextContent: !!demoDiagnosis.text_content,
      hasRichElements: Array.isArray(demoDiagnosis.rich_elements),
      hasTimestamp: !!demoDiagnosis.created_at,
      hasVersion: !!demoDiagnosis.version
    };
    
    const test1Success = Object.values(treatmentValidation).every(v => v) && 
                        Object.values(diagnosisValidation).every(v => v);
    
    results.push({
      testName: 'Database Schema and Types',
      success: test1Success,
      duration: performance.now() - test1Start,
      details: { treatmentValidation, diagnosisValidation }
    });
    
    console.log(test1Success ? '✅ PASS' : '❌ FAIL', 'Database schema validation');
    
  } catch (error) {
    results.push({
      testName: 'Database Schema and Types',
      success: false,
      duration: performance.now() - test1Start,
      details: {},
      errors: [error instanceof Error ? error.message : String(error)]
    });
  }

  // Test 2: Clinical Engine API Workflow
  const test2Start = performance.now();
  try {
    console.log('\n🧠 Test 2: Clinical Engine API Complete Workflow...');
    
    const patientData = {
      patient: {
        firstName: "Dorothy",
        lastName: "Robinson", 
        age: 46,
        gender: "female"
      },
      conditions: ["Type 2 Diabetes Mellitus", "History of DVT", "Acute Myelomonocytic Leukemia (remission)"],
      treatments: ["Metformin 1000mg twice daily", "Warfarin for anticoagulation", "Glyburide 5mg twice daily"]
    };

    const diagnosis = {
      diagnosisName: "Type 2 diabetes mellitus, poorly controlled with high-risk drug interaction",
      confidence: 0.95,
      supportingEvidence: [
        "Polyuria and polydipsia consistent with hyperglycemia",
        "Orthostatic hypotension from dehydration", 
        "Glyburide-Warfarin interaction causing bleeding risk",
        "Easy bruising and prolonged nosebleed",
        "Lack of glucose monitoring for 1 month"
      ],
      reasoningExplanation: "Patient presents with classic hyperglycemia symptoms complicated by dangerous drug interaction requiring immediate medication adjustment and hospitalization for stabilization"
    };

    const transcript = DemoDataService.getEncounterData().transcript;

    // Test the API call
    const apiResponse = await fetch('/api/clinical-engine/treatments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientData, diagnosis, transcript })
    });

    const responseData = await apiResponse.json();
    
    const apiValidation = {
      responseOk: apiResponse.ok,
      hasSuccess: responseData.success,
      hasTreatments: !!responseData.treatments?.treatments,
      treatmentCount: responseData.treatments?.treatments?.length || 0,
      hasDecisionTree: !!responseData.treatments?.decisionTree,
      hasFollowUp: !!responseData.treatments?.followUpPlan,
      hasNonPharm: !!responseData.treatments?.nonPharmacologicalTreatments,
      processingTime: responseData.processingTimeMs
    };

    const test2Success = apiValidation.responseOk && apiValidation.hasSuccess && 
                        apiValidation.treatmentCount > 0 && apiValidation.hasDecisionTree;

    results.push({
      testName: 'Clinical Engine API Workflow',
      success: test2Success,
      duration: performance.now() - test2Start,
      details: { apiValidation, sampleTreatment: responseData.treatments?.treatments?.[0] }
    });

    console.log(test2Success ? '✅ PASS' : '❌ FAIL', 'Clinical Engine API workflow');
    
  } catch (error) {
    results.push({
      testName: 'Clinical Engine API Workflow', 
      success: false,
      duration: performance.now() - test2Start,
      details: {},
      errors: [error instanceof Error ? error.message : String(error)]
    });
  }

  // Test 3: Rich Content Processing and Guidelines Extraction
  const test3Start = performance.now();
  try {
    console.log('\n📋 Test 3: Rich Content Processing and Guidelines...');
    
    const { extractGuidelinesFromRichContent } = await import('./components/ui/clinical-guidelines-indicator');
    
    const treatmentContent = DemoDataService.getDemoRichTreatmentContent();
    const extractedGuidelines = extractGuidelinesFromRichContent(treatmentContent);
    
    const guidelinesValidation = {
      guidelinesExtracted: extractedGuidelines.length > 0,
      hasHighLevel: extractedGuidelines.some(g => g.level === 'high'),
      hasMediumLevel: extractedGuidelines.some(g => g.level === 'medium'),
      hasRecommendations: extractedGuidelines.some(g => g.type === 'recommendation'),
      hasEvidence: extractedGuidelines.some(g => g.type === 'evidence'),
      uniqueTitles: new Set(extractedGuidelines.map(g => g.title)).size
    };

    // Test decision tree structure
    const decisionTreeElement = treatmentContent.rich_elements.find(el => el.type === 'decision_tree');
    const decisionTreeValidation = {
      hasDecisionTree: !!decisionTreeElement,
      hasNodes: !!decisionTreeElement?.data?.nodes?.length,
      hasConnections: !!decisionTreeElement?.data?.connections?.length,
      hasGuidelinesRefs: !!decisionTreeElement?.data?.guidelines_references?.length,
      nodeCount: decisionTreeElement?.data?.nodes?.length || 0,
      connectionCount: decisionTreeElement?.data?.connections?.length || 0
    };

    const test3Success = guidelinesValidation.guidelinesExtracted && 
                        decisionTreeValidation.hasDecisionTree &&
                        decisionTreeValidation.nodeCount > 0;

    results.push({
      testName: 'Rich Content and Guidelines',
      success: test3Success,
      duration: performance.now() - test3Start,
      details: { guidelinesValidation, decisionTreeValidation, extractedGuidelines }
    });

    console.log(test3Success ? '✅ PASS' : '❌ FAIL', 'Rich content and guidelines processing');
    
  } catch (error) {
    results.push({
      testName: 'Rich Content and Guidelines',
      success: false,
      duration: performance.now() - test3Start,
      details: {},
      errors: [error instanceof Error ? error.message : String(error)]
    });
  }

  // Test 4: EHR Format Compatibility
  const test4Start = performance.now();
  try {
    console.log('\n🏥 Test 4: EHR Format Compatibility Testing...');
    
    // Test different EHR input formats
    const ehrFormats = [
      {
        name: 'Semicolon Separated',
        data: {
          patientData: {
            patient: { firstName: "Test", lastName: "Patient", age: 45, gender: "female" },
            conditions: ["Hypertension"],
            treatments: ["Metformin 500mg twice daily; Lisinopril 10mg once daily; Aspirin 81mg daily"]
          },
          diagnosis: {
            diagnosisName: "Essential hypertension with diabetes",
            confidence: 0.9,
            supportingEvidence: ["Elevated BP readings"],
            reasoningExplanation: "Standard hypertension management"
          },
          transcript: "Patient presents with elevated blood pressure..."
        }
      },
      {
        name: 'Pipe Separated Table',
        data: {
          patientData: {
            patient: { firstName: "Test", lastName: "Patient", age: 45, gender: "male" },
            conditions: ["Coronary Artery Disease"],
            treatments: ["Atorvastatin|20mg|Daily|Cholesterol\nMetoprolol|25mg|Twice daily|Blood pressure"]
          },
          diagnosis: {
            diagnosisName: "Coronary artery disease",
            confidence: 0.85,
            supportingEvidence: ["Chest pain", "Abnormal stress test"],
            reasoningExplanation: "CAD management required"
          },
          transcript: "Patient with known CAD..."
        }
      }
    ];

    const ehrResults = [];
    
    for (const format of ehrFormats) {
      try {
        const response = await fetch('/api/clinical-engine/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(format.data)
        });
        
        const result = await response.json();
        
        ehrResults.push({
          format: format.name,
          success: response.ok && result.success,
          treatmentCount: result.treatments?.treatments?.length || 0,
          hasDecisionTree: !!result.treatments?.decisionTree,
          processingTime: result.processingTimeMs
        });
        
      } catch (error) {
        ehrResults.push({
          format: format.name,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const test4Success = ehrResults.every(r => r.success);

    results.push({
      testName: 'EHR Format Compatibility',
      success: test4Success,
      duration: performance.now() - test4Start,
      details: { ehrResults }
    });

    console.log(test4Success ? '✅ PASS' : '❌ FAIL', 'EHR format compatibility');
    
  } catch (error) {
    results.push({
      testName: 'EHR Format Compatibility',
      success: false,
      duration: performance.now() - test4Start,
      details: {},
      errors: [error instanceof Error ? error.message : String(error)]
    });
  }

  // Test 5: Performance and Load Testing
  const test5Start = performance.now();
  try {
    console.log('\n⚡ Test 5: Performance and Load Testing...');
    
    const performanceTests = [];
    const testCases = 5; // Run 5 concurrent API calls
    
    const performancePromises = Array.from({ length: testCases }, async (_, index) => {
      const startTime = performance.now();
      
      try {
        const response = await fetch('/api/clinical-engine/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientData: {
              patient: { firstName: `Test${index}`, lastName: "Patient", age: 40 + index, gender: "female" },
              conditions: ["Diabetes", "Hypertension"],
              treatments: ["Metformin 1000mg twice daily"]
            },
            diagnosis: {
              diagnosisName: `Test diagnosis ${index}`,
              confidence: 0.8,
              supportingEvidence: ["Test evidence"],
              reasoningExplanation: "Performance test"
            },
            transcript: `Performance test transcript ${index}...`
          })
        });
        
        const result = await response.json();
        const endTime = performance.now();
        
        return {
          testIndex: index,
          success: response.ok && result.success,
          responseTime: endTime - startTime,
          treatmentCount: result.treatments?.treatments?.length || 0
        };
        
      } catch (error) {
        return {
          testIndex: index,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          responseTime: performance.now() - startTime
        };
      }
    });

    const performanceResults = await Promise.all(performancePromises);
    
    const performanceMetrics = {
      totalTests: performanceResults.length,
      successfulTests: performanceResults.filter(r => r.success).length,
      averageResponseTime: performanceResults.reduce((acc, r) => acc + (r.responseTime || 0), 0) / performanceResults.length,
      maxResponseTime: Math.max(...performanceResults.map(r => r.responseTime || 0)),
      minResponseTime: Math.min(...performanceResults.map(r => r.responseTime || 0))
    };

    const test5Success = performanceMetrics.successfulTests === performanceMetrics.totalTests &&
                        performanceMetrics.averageResponseTime < 60000; // Under 60 seconds average

    results.push({
      testName: 'Performance and Load Testing',
      success: test5Success,
      duration: performance.now() - test5Start,
      details: { performanceMetrics, performanceResults }
    });

    console.log(test5Success ? '✅ PASS' : '❌ FAIL', 'Performance and load testing');
    
  } catch (error) {
    results.push({
      testName: 'Performance and Load Testing',
      success: false,
      duration: performance.now() - test5Start,
      details: {},
      errors: [error instanceof Error ? error.message : String(error)]
    });
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Complete Workflow Test Summary');
  console.log('='.repeat(60));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);
  
  console.log(`Tests Run: ${totalTests}`);
  console.log(`Tests Passed: ${passedTests}`);
  console.log(`Tests Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}ms`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${result.duration.toFixed(2)}ms`);
    if (result.errors?.length) {
      result.errors.forEach(error => console.log(`   Error: ${error}`));
    }
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production.');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review details above.`);
  }

  return results;
}

// Export for use in development
if (typeof window !== 'undefined') {
  (window as any).runCompleteWorkflowTest = runCompleteWorkflowTest;
  console.log('🔧 Complete workflow test available as window.runCompleteWorkflowTest()');
}

export { runCompleteWorkflowTest }; 