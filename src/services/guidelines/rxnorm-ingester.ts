import { BaseGuidelineIngester, IngestionResult } from './base-ingester';

interface DrugInteraction {
  interactionPair: [{
    interactionConcept: [{
      minConceptItem: {
        name: string;
        rxcui: string;
      };
      sourceConceptItem: {
        name: string;
        rxcui: string;
      };
    }];
    description: string;
    severity: string;
  }];
}

interface RxNormResponse {
  interactionTypeGroup?: Array<{
    interactionType?: Array<{
      interactionPair?: any[];
    }>;
  }>;
}

export class RxNormIngester extends BaseGuidelineIngester {
  private baseUrl = 'https://rxnav.nlm.nih.gov/REST';
  
  // Common medications to check for interactions
  private commonMedications = [
    { name: 'warfarin', rxcui: '11289' },
    { name: 'aspirin', rxcui: '1191' },
    { name: 'metformin', rxcui: '6809' },
    { name: 'lisinopril', rxcui: '29046' },
    { name: 'simvastatin', rxcui: '36567' },
    { name: 'amlodipine', rxcui: '17767' },
    { name: 'metoprolol', rxcui: '6918' },
    { name: 'omeprazole', rxcui: '7646' },
    { name: 'levothyroxine', rxcui: '10582' },
    { name: 'hydrochlorothiazide', rxcui: '5487' }
  ];

  constructor() {
    super('RxNorm');
  }

  isConfigured(): boolean {
    // RxNorm API is public, no API key required
    return true;
  }

  async ingest(): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: false,
      documentsProcessed: 0,
      documentsUpdated: 0,
      errors: []
    };

    await this.logIngestion('started', 'Starting RxNorm drug interactions ingestion');

    try {
      for (const medication of this.commonMedications) {
        try {
          const interactions = await this.fetchInteractions(medication.rxcui);
          const processed = await this.processInteractions(medication.name, interactions);
          
          result.documentsProcessed += processed.documentsProcessed;
          result.documentsUpdated += processed.documentsUpdated;
          
          if (processed.errors.length > 0) {
            result.errors.push(...processed.errors);
          }
        } catch (error) {
          const errorMsg = `Error processing interactions for ${medication.name}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      
      const message = `Processed ${result.documentsProcessed} interactions, updated ${result.documentsUpdated}`;
      await this.logIngestion(
        result.success ? 'completed' : 'failed',
        message,
        result.documentsUpdated
      );

    } catch (error) {
      const errorMsg = `Failed to process RxNorm interactions: ${error}`;
      result.errors.push(errorMsg);
      await this.logIngestion('failed', errorMsg);
    }

    return result;
  }

  private async fetchInteractions(rxcui: string): Promise<DrugInteraction[]> {
    try {
      const url = `${this.baseUrl}/interaction/interaction.json?rxcui=${rxcui}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: RxNormResponse = await response.json();
      
      if (!data.interactionTypeGroup || !Array.isArray(data.interactionTypeGroup) || data.interactionTypeGroup.length === 0) {
        return [];
      }

      const interactions: DrugInteraction[] = [];
      
      for (const group of data.interactionTypeGroup) {
        for (const type of group.interactionType) {
          for (const pair of type.interactionPair) {
            interactions.push({ interactionPair: [pair] });
          }
        }
      }

      return interactions;
    } catch (error) {
      throw new Error(`Failed to fetch interactions for ${rxcui}: ${error}`);
    }
  }

  private async processInteractions(
    medicationName: string, 
    interactions: DrugInteraction[]
  ): Promise<{ documentsProcessed: number; documentsUpdated: number; errors: string[] }> {
    const result = {
      documentsProcessed: 0,
      documentsUpdated: 0,
      errors: []
    };

    for (const interaction of interactions) {
      try {
        const pair = interaction.interactionPair[0];
        const concept = pair.interactionConcept[0];
        
        const drug1 = concept.minConceptItem.name;
        const drug2 = concept.sourceConceptItem.name;
        const description = pair.description;
        const severity = this.determineSeverity(description);

        const title = `Drug Interaction: ${drug1} + ${drug2}`;
        const content = this.formatInteractionContent(drug1, drug2, description, severity);
        
        const metadata = {
          drug_names: [drug1, drug2],
          severity,
          organization: 'NLM/RxNorm',
          category: 'Drug Interaction'
        };

        const docId = await this.saveGuideline(title, content, 'Pharmacology', metadata);
        result.documentsProcessed++;
        
        if (docId) {
          result.documentsUpdated++;
        }
      } catch (error) {
        const errorMsg = `Error processing interaction: ${error}`;
        result.errors.push(errorMsg);
      }
    }

    return result;
  }

  private determineSeverity(description: string): 'low' | 'moderate' | 'high' {
    const descLower = description.toLowerCase();
    
    if (descLower.includes('contraindicated') || 
        descLower.includes('serious') || 
        descLower.includes('major') ||
        descLower.includes('severe') ||
        descLower.includes('life-threatening')) {
      return 'high';
    }
    
    if (descLower.includes('moderate') || 
        descLower.includes('monitor') ||
        descLower.includes('caution') ||
        descLower.includes('increase') ||
        descLower.includes('decrease')) {
      return 'moderate';
    }
    
    return 'low';
  }

  private formatInteractionContent(
    drug1: string, 
    drug2: string, 
    description: string, 
    severity: string
  ): string {
    return `# Drug Interaction: ${drug1} + ${drug2}

## Severity: ${severity.toUpperCase()}

## Description
${description}

## Clinical Considerations
- Monitor patient closely when these medications are used together
- Consider alternative medications if appropriate
- Adjust dosing as necessary based on clinical response
- Be aware of signs and symptoms related to this interaction

---
*Source: RxNorm/RxNav Drug Interaction Database*
*Severity Level: ${severity}*`;
  }
} 