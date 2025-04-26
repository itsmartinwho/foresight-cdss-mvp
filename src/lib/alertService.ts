import { ComplexCaseAlert, CopilotSuggestion } from './types';

/**
 * Service for complex case alerting and co-pilot suggestions
 */
class AlertService {
  /**
   * Check for complex case patterns in patient data and transcript
   */
  async checkForComplexCase(patientId: string, transcriptText: string): Promise<ComplexCaseAlert | null> {
    try {
      // In production, this would analyze patient data and transcript using NLP/ML
      // For the MVP, we'll use simple pattern matching
      
      // Check for autoimmune/inflammatory patterns
      const autoimmuneTriggers = [
        'joint pain', 'morning stiffness', 'fatigue', 'rash', 'swelling',
        'inflammation', 'lupus', 'rheumatoid', 'thyroid', 'hashimoto'
      ];
      
      // Check for oncology patterns
      const oncologyTriggers = [
        'weight loss', 'night sweats', 'lump', 'mass', 'cancer',
        'leukemia', 'lymphoma', 'tumor', 'malignant', 'metastasis'
      ];
      
      // Count triggers
      const autoimmuneTriggerCount = autoimmuneTriggers.filter(
        trigger => transcriptText.toLowerCase().includes(trigger)
      ).length;
      
      const oncologyTriggerCount = oncologyTriggers.filter(
        trigger => transcriptText.toLowerCase().includes(trigger)
      ).length;
      
      // Determine if there's a complex case
      if (autoimmuneTriggerCount >= 3) {
        return this.createComplexCaseAlert(
          patientId, 
          'autoimmune', 
          autoimmuneTriggerCount >= 5 ? 'high' : 'medium',
          autoimmuneTriggers.filter(trigger => transcriptText.toLowerCase().includes(trigger))
        );
      } else if (oncologyTriggerCount >= 3) {
        return this.createComplexCaseAlert(
          patientId, 
          'oncology', 
          oncologyTriggerCount >= 5 ? 'high' : 'medium',
          oncologyTriggers.filter(trigger => transcriptText.toLowerCase().includes(trigger))
        );
      }
      
      return null;
    } catch (error) {
      console.error('Error checking for complex case:', error);
      return null;
    }
  }
  
  /**
   * Create a complex case alert
   */
  private createComplexCaseAlert(
    patientId: string, 
    type: 'autoimmune' | 'inflammatory' | 'oncology',
    severity: 'low' | 'medium' | 'high',
    triggeringFactors: string[]
  ): ComplexCaseAlert {
    const suggestedActions = this.getSuggestedActions(type, severity);
    
    return {
      id: `alert_${Date.now()}`,
      patientId,
      type,
      severity,
      triggeringFactors,
      suggestedActions,
      createdAt: new Date().toISOString(),
      acknowledged: false
    };
  }
  
  /**
   * Get suggested actions based on alert type and severity
   */
  private getSuggestedActions(
    type: 'autoimmune' | 'inflammatory' | 'oncology',
    severity: 'low' | 'medium' | 'high'
  ): string[] {
    if (type === 'autoimmune' || type === 'inflammatory') {
      if (severity === 'high') {
        return [
          'Order comprehensive autoimmune panel (RF, anti-CCP, ANA, anti-dsDNA, complement levels)',
          'Order inflammatory markers (ESR, CRP)',
          'Consider immediate rheumatology referral',
          'Consider joint imaging (X-ray, ultrasound)'
        ];
      } else {
        return [
          'Order basic autoimmune screening (RF, ANA)',
          'Order inflammatory markers (ESR, CRP)',
          'Consider rheumatology referral if positive findings'
        ];
      }
    } else if (type === 'oncology') {
      if (severity === 'high') {
        return [
          'Order comprehensive blood panel (CBC with differential, CMP)',
          'Consider tumor markers based on presentation',
          'Order appropriate imaging studies',
          'Urgent oncology referral'
        ];
      } else {
        return [
          'Order CBC with differential',
          'Consider basic imaging based on symptoms',
          'Schedule close follow-up to monitor symptoms'
        ];
      }
    }
    
    return ['Evaluate symptoms further', 'Consider specialist referral if symptoms persist'];
  }
  
  /**
   * Generate real-time co-pilot suggestions based on transcript
   */
  async generateCopilotSuggestions(transcriptText: string): Promise<CopilotSuggestion[]> {
    try {
      // In production, this would use NLP/ML to analyze the transcript in real-time
      // For the MVP, we'll use simple pattern matching
      
      const suggestions: CopilotSuggestion[] = [];
      
      // Check for patterns that would trigger suggestions
      if (transcriptText.toLowerCase().includes('joint pain') && 
          !transcriptText.toLowerCase().includes('morning stiffness')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_1`,
          type: 'question',
          content: 'Ask about morning stiffness and its duration',
          context: 'Morning stiffness >1 hour suggests inflammatory arthritis',
          relevanceScore: 0.9,
          createdAt: new Date().toISOString(),
          dismissed: false,
          actioned: false
        });
      }
      
      if (transcriptText.toLowerCase().includes('fatigue') && 
          !transcriptText.toLowerCase().includes('sleep')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_2`,
          type: 'question',
          content: 'Ask about sleep quality and duration',
          context: 'Poor sleep can contribute to fatigue but may also suggest underlying conditions',
          relevanceScore: 0.8,
          createdAt: new Date().toISOString(),
          dismissed: false,
          actioned: false
        });
      }
      
      if (transcriptText.toLowerCase().includes('joint pain') || 
          transcriptText.toLowerCase().includes('arthritis')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_3`,
          type: 'test',
          content: 'Consider ordering RF, anti-CCP, ESR, CRP',
          context: 'Standard workup for inflammatory arthritis',
          relevanceScore: 0.85,
          createdAt: new Date().toISOString(),
          dismissed: false,
          actioned: false
        });
      }
      
      if (transcriptText.toLowerCase().includes('methotrexate')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_4`,
          type: 'medication',
          content: 'Remember to prescribe folic acid with methotrexate',
          context: 'Reduces side effects of methotrexate therapy',
          relevanceScore: 0.95,
          createdAt: new Date().toISOString(),
          dismissed: false,
          actioned: false
        });
      }
      
      if (transcriptText.toLowerCase().includes('rheumatoid arthritis')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_5`,
          type: 'guideline',
          content: '2021 ACR Guidelines recommend methotrexate as first-line therapy for RA',
          context: 'Evidence-based treatment recommendation',
          relevanceScore: 0.9,
          createdAt: new Date().toISOString(),
          dismissed: false,
          actioned: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Error generating co-pilot suggestions:', error);
      return [];
    }
  }
}

// Export as singleton
export const alertService = new AlertService();
