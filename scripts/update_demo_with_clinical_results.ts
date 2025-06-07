import { DemoDataService } from '../src/services/demo/DemoDataService';

/**
 * Script to update the demo system with fresh clinical engine results
 * This takes the clinical results we generated and updates the DemoDataService hardcoded data
 */

// New clinical results from our successful API call
const newClinicalResults = {
  // Primary diagnosis from clinical engine
  primaryDiagnosis: {
    name: "Fecal impaction",
    code: "K56.41",
    confidence: 90,
    description: "Fecal impaction with severe constipation requiring aggressive bowel regimen and medical intervention"
  },
  
  // Differential diagnoses from clinical engine
  differentialDiagnoses: [
    {
      name: "Opioid-Induced Constipation",
      likelihood: "High (90%)",
      keyFactors: "Recent hydrocodone use post-dental surgery, 6-day constipation history",
      priority: 1
    },
    {
      name: "Fecal Impaction", 
      likelihood: "Medium (60%)",
      keyFactors: "Abdominal distension, hard stool on rectal exam, radiographic findings",
      priority: 2
    },
    {
      name: "Dehydration Related Functional Constipation",
      likelihood: "Medium (70%)",
      keyFactors: "Poor fluid intake (1 glass water/day), low-fiber diet (fast food)",
      priority: 3
    },
    {
      name: "Partial Large Bowel Obstruction",
      likelihood: "Low (30%)", 
      keyFactors: "Colonic fecal retention on imaging, no complete obstruction signs",
      priority: 4
    },
    {
      name: "Secondary Constipation Due to AML History",
      likelihood: "Low (10%)",
      keyFactors: "History of acute myelomonocytic leukemia, potential medication effects",
      priority: 5
    }
  ],
  
  // Treatment recommendations from clinical engine
  treatments: [
    {
      drug: "Polyethylene glycol 3350 17g every 6 hours until bowel movement, then 17g nightly for 14 days",
      status: "Prescribed",
      rationale: "Osmotic laxative for severe fecal impaction with maintenance therapy to prevent recurrence"
    },
    {
      drug: "Docusate sodium 200mg twice daily",
      status: "Prescribed", 
      rationale: "Stool softener to facilitate easier bowel movements and reduce straining"
    },
    {
      drug: "Glycerin suppository every 12 hours as needed",
      status: "As needed",
      rationale: "Rectal stimulant if no bowel movement occurs within 12 hours"
    },
    {
      drug: "High-fiber diet with 25-30g fiber daily",
      status: "Patient education",
      rationale: "Dietary modification to prevent future constipation episodes and promote regular bowel function"
    },
    {
      drug: "Increased fluid intake to 8-10 glasses of water daily", 
      status: "Patient education",
      rationale: "Adequate hydration essential for preventing constipation and supporting treatment effectiveness"
    }
  ]
};

async function updateDemoDataService() {
  console.log('🔄 Updating DemoDataService with fresh clinical results...');
  
  try {
    // Read current DemoDataService file
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const filePath = path.join(process.cwd(), 'src/services/demo/DemoDataService.ts');
    const currentContent = await fs.readFile(filePath, 'utf-8');
    
    // Update the diagnosis description in the demo data
    const updatedContent = currentContent.replace(
      /description: "Functional constipation, likely opioid-induced with contributing low-fiber diet"/,
      `description: "${newClinicalResults.primaryDiagnosis.description}"`
    ).replace(
      /code: "K59\.00"/,
      `code: "${newClinicalResults.primaryDiagnosis.code}"`
    );
    
    // Update the treatments array
    const newTreatmentsCode = `treatments: [
    ${newClinicalResults.treatments.map(treatment => 
      `{ 
      drug: "${treatment.drug}", 
      status: "${treatment.status}", 
      rationale: "${treatment.rationale}" 
    }`
    ).join(',\n    ')}
  ]`;
    
    const treatmentsUpdated = updatedContent.replace(
      /treatments: \[[\s\S]*?\]/,
      newTreatmentsCode
    );
    
    // Write updated content back to file
    await fs.writeFile(filePath, treatmentsUpdated);
    
    console.log('✅ DemoDataService updated successfully!');
    console.log('📊 New clinical results:');
    console.log(`   Primary Diagnosis: ${newClinicalResults.primaryDiagnosis.name} (${newClinicalResults.primaryDiagnosis.code})`);
    console.log(`   Differential Diagnoses: ${newClinicalResults.differentialDiagnoses.length} generated`);
    console.log(`   Treatment Recommendations: ${newClinicalResults.treatments.length} items`);
    
    return {
      success: true,
      data: newClinicalResults
    };
    
  } catch (error) {
    console.error('❌ Error updating DemoDataService:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export data for use by demo hooks
export const demoClinicalResults = newClinicalResults;
export default updateDemoDataService;

// Run if called directly
if (require.main === module) {
  updateDemoDataService()
    .then(result => {
      if (result.success) {
        console.log('🎉 Demo data update completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 Demo data update failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script execution failed:', error);
      process.exit(1);
    });
} 