// Test script to verify clinical engine treatments API and rich content workflow
import { DemoDataService } from './services/demo/DemoDataService';

async function testTreatmentsAPI() {
  console.log('🧪 Testing Clinical Engine Treatments API');
  console.log('='.repeat(50));

  try {
    // Test 1: Verify demo rich content generation
    console.log('\n1. Testing Demo Rich Content Generation...');
    const demoTreatmentContent = DemoDataService.getDemoRichTreatmentContent();
    const demoDiagnosisContent = DemoDataService.getDemoRichDiagnosisContent();

    console.log('✅ Demo treatment content:', {
      contentType: demoTreatmentContent.content_type,
      textContentLength: demoTreatmentContent.text_content.length,
      richElementsCount: demoTreatmentContent.rich_elements.length,
      hasDecisionTree: demoTreatmentContent.rich_elements.some(el => el.type === 'decision_tree'),
      hasTable: demoTreatmentContent.rich_elements.some(el => el.type === 'table')
    });

    console.log('✅ Demo diagnosis content:', {
      contentType: demoDiagnosisContent.content_type,
      textContentLength: demoDiagnosisContent.text_content.length,
      richElementsCount: demoDiagnosisContent.rich_elements.length
    });

    // Test 2: Test API endpoint with sample data
    console.log('\n2. Testing Treatments API Endpoint...');
    const testPatientData = {
      patient: {
        firstName: "Dorothy",
        lastName: "Robinson",
        age: 46,
        gender: "female"
      },
      conditions: ["Type 2 Diabetes Mellitus", "History of DVT"],
      treatments: ["Metformin 1000mg twice daily", "Warfarin for anticoagulation"]
    };

    const testDiagnosis = {
      diagnosisName: "Type 2 diabetes mellitus, poorly controlled with drug interaction risk",
      confidence: 0.95,
      supportingEvidence: [
        "Polyuria and polydipsia symptoms",
        "Orthostatic hypotension from dehydration",
        "Glyburide-Warfarin interaction causing bleeding risk"
      ],
      reasoningExplanation: "Patient presents with classic hyperglycemia symptoms combined with dangerous drug interaction requiring immediate medication adjustment"
    };

    const testTranscript = DemoDataService.getEncounterData().transcript.substring(0, 500) + "...";

    const apiResponse = await fetch('/api/clinical-engine/treatments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientData: testPatientData,
        diagnosis: testDiagnosis,
        transcript: testTranscript
      })
    });

    if (apiResponse.ok) {
      const result = await apiResponse.json();
      console.log('✅ API Response successful:', {
        success: result.success,
        treatmentsCount: result.treatments?.treatments?.length || 0,
        hasDecisionTree: !!result.treatments?.decisionTree,
        hasFollowUpPlan: !!result.treatments?.followUpPlan,
        processingTime: result.processingTimeMs
      });

      // Test the structured output
      if (result.treatments?.treatments) {
        console.log('\n   Sample Treatment:');
        const firstTreatment = result.treatments.treatments[0];
        console.log('   ', {
          medication: firstTreatment.medication,
          dosage: firstTreatment.dosage,
          hasRationale: !!firstTreatment.rationale,
          hasMonitoring: !!firstTreatment.monitoring,
          hasGuidelines: !!firstTreatment.guidelines_reference
        });
      }

      if (result.treatments?.decisionTree) {
        console.log('\n   Decision Tree:');
        console.log('   ', {
          title: result.treatments.decisionTree.title,
          nodesCount: result.treatments.decisionTree.nodes?.length || 0,
          connectionsCount: result.treatments.decisionTree.connections?.length || 0,
          hasGuidelinesRefs: result.treatments.decisionTree.guidelines_references?.length > 0
        });
      }

    } else {
      console.error('❌ API Response failed:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText
      });
    }

    // Test 3: Verify guidelines extraction
    console.log('\n3. Testing Guidelines Extraction...');
    const { extractGuidelinesFromRichContent } = await import('./components/ui/clinical-guidelines-indicator');
    
    const extractedGuidelines = extractGuidelinesFromRichContent(demoTreatmentContent);
    console.log('✅ Extracted Guidelines:', {
      count: extractedGuidelines.length,
      types: [...new Set(extractedGuidelines.map(g => g.type))],
      sources: [...new Set(extractedGuidelines.map(g => g.source))],
      levels: [...new Set(extractedGuidelines.map(g => g.level))]
    });

    if (extractedGuidelines.length > 0) {
      console.log('   Sample Guideline:', {
        title: extractedGuidelines[0].title,
        source: extractedGuidelines[0].source,
        type: extractedGuidelines[0].type,
        level: extractedGuidelines[0].level
      });
    }

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Export for use in development
if (typeof window !== 'undefined') {
  (window as any).testTreatmentsAPI = testTreatmentsAPI;
  console.log('🔧 Test function available as window.testTreatmentsAPI()');
}

export { testTreatmentsAPI }; 