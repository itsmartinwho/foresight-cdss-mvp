import { Patient, ComplexCaseAlert, Encounter, Diagnosis } from '@/lib/types';
import { Specialty } from '@/types/guidelines';

export class SpecialtySuggestionService {
  /**
   * Suggests a specialty based on patient context including alerts, diagnoses, and demographics
   */
  static async suggestSpecialtyFromPatient(
    patient: Patient, 
    recentEncounters?: Encounter[],
    recentDiagnoses?: Diagnosis[]
  ): Promise<Specialty> {
    
    // Check patient alerts first (highest priority)
    if (patient.alerts && patient.alerts.length > 0) {
      const alertSpecialty = this.mapAlertsToSpecialty(patient.alerts);
      if (alertSpecialty !== 'General Medicine') {
        return alertSpecialty;
      }
    }

    // Check recent diagnoses (medium priority)
    if (recentDiagnoses && recentDiagnoses.length > 0) {
      const diagnosisSpecialty = this.mapDiagnosesToSpecialty(recentDiagnoses);
      if (diagnosisSpecialty !== 'General Medicine') {
        return diagnosisSpecialty;
      }
    }

    // Check recent encounter reasons (medium priority)
    if (recentEncounters && recentEncounters.length > 0) {
      const encounterSpecialty = this.mapEncountersToSpecialty(recentEncounters);
      if (encounterSpecialty !== 'General Medicine') {
        return encounterSpecialty;
      }
    }

    // Check patient demographics (low priority)
    const demographicSpecialty = this.mapDemographicsToSpecialty(patient);
    if (demographicSpecialty !== 'General Medicine') {
      return demographicSpecialty;
    }

    // Default to Primary Care for general/preventive care
    return 'Primary Care';
  }

  /**
   * Map patient alerts to specialty
   */
  private static mapAlertsToSpecialty(alerts: ComplexCaseAlert[]): Specialty {
    for (const alert of alerts) {
      switch (alert.type) {
        case 'oncology':
          return 'Oncology';
        case 'autoimmune':
        case 'inflammatory':
          return 'Rheumatology';
        default:
          // Check alert message content
          if (alert.msg) {
            const specialty = this.mapTermsToSpecialty(alert.msg);
            if (specialty !== 'General Medicine') {
              return specialty;
            }
          }
      }
    }
    return 'General Medicine';
  }

  /**
   * Map diagnoses to specialty
   */
  private static mapDiagnosesToSpecialty(diagnoses: Diagnosis[]): Specialty {
    for (const diagnosis of diagnoses) {
      if (diagnosis.description) {
        const specialty = this.mapTermsToSpecialty(diagnosis.description);
        if (specialty !== 'General Medicine') {
          return specialty;
        }
      }
      
      // Check ICD-10 code ranges
      if (diagnosis.code) {
        const codeSpecialty = this.mapICD10CodeToSpecialty(diagnosis.code);
        if (codeSpecialty !== 'General Medicine') {
          return codeSpecialty;
        }
      }
    }
    return 'General Medicine';
  }

  /**
   * Map encounters to specialty
   */
  private static mapEncountersToSpecialty(encounters: Encounter[]): Specialty {
    for (const encounter of encounters) {
      if (encounter.reasonDisplayText) {
        const specialty = this.mapTermsToSpecialty(encounter.reasonDisplayText);
        if (specialty !== 'General Medicine') {
          return specialty;
        }
      }
      
      if (encounter.reasonCode) {
        const specialty = this.mapTermsToSpecialty(encounter.reasonCode);
        if (specialty !== 'General Medicine') {
          return specialty;
        }
      }
    }
    return 'General Medicine';
  }

  /**
   * Map patient demographics to specialty
   */
  private static mapDemographicsToSpecialty(patient: Patient): Specialty {
    // Age-based suggestions
    if (patient.dateOfBirth) {
      const age = this.calculateAge(patient.dateOfBirth);
      
      // Pediatric conditions
      if (age < 18) {
        return 'Primary Care'; // Could be pediatrics if we had that specialty
      }
      
      // Geriatric focus
      if (age >= 65) {
        return 'Primary Care'; // Focus on preventive care for elderly
      }

      // Reproductive health for women of childbearing age
      if (patient.gender?.toLowerCase() === 'female' && age >= 15 && age <= 50) {
        // Don't automatically suggest OB/GYN unless there are specific indicators
        // Keep as primary care for general wellness
      }
    }

    return 'General Medicine';
  }

  /**
   * Map medical terms to specialty (adapted from base-ingester.ts)
   */
  private static mapTermsToSpecialty(text: string): Specialty {
    const textLower = text.toLowerCase();
    
    // Oncology
    if (textLower.includes('cancer') || textLower.includes('oncology') || 
        textLower.includes('tumor') || textLower.includes('malignant') ||
        textLower.includes('chemotherapy') || textLower.includes('radiation') ||
        textLower.includes('metastasis') || textLower.includes('carcinoma')) {
      return 'Oncology';
    }
    
    // Endocrinology
    if (textLower.includes('diabetes') || textLower.includes('thyroid') || 
        textLower.includes('endocrine') || textLower.includes('insulin') ||
        textLower.includes('glucose') || textLower.includes('hormone') ||
        textLower.includes('adrenal') || textLower.includes('pituitary')) {
      return 'Endocrinology';
    }
    
    // Cardiology
    if (textLower.includes('heart') || textLower.includes('cardiac') || 
        textLower.includes('hypertension') || textLower.includes('cardiovascular') ||
        textLower.includes('chest pain') || textLower.includes('arrhythmia') ||
        textLower.includes('coronary') || textLower.includes('myocardial')) {
      return 'Cardiology';
    }
    
    // Rheumatology
    if (textLower.includes('arthritis') || textLower.includes('lupus') || 
        textLower.includes('rheumatoid') || textLower.includes('autoimmune') ||
        textLower.includes('joint pain') || textLower.includes('fibromyalgia') ||
        textLower.includes('inflammation') || textLower.includes('connective tissue')) {
      return 'Rheumatology';
    }
    
    // Pharmacology
    if (textLower.includes('drug') || textLower.includes('interaction') || 
        textLower.includes('medication') || textLower.includes('pharmacy') ||
        textLower.includes('adverse reaction') || textLower.includes('dosage')) {
      return 'Pharmacology';
    }
    
    // Pulmonology
    if (textLower.includes('lung') || textLower.includes('pulmonary') || 
        textLower.includes('respiratory') || textLower.includes('asthma') ||
        textLower.includes('copd') || textLower.includes('pneumonia') ||
        textLower.includes('breathing') || textLower.includes('bronchial')) {
      return 'Pulmonology';
    }
    
    // Neurology
    if (textLower.includes('brain') || textLower.includes('neuro') || 
        textLower.includes('seizure') || textLower.includes('stroke') ||
        textLower.includes('headache') || textLower.includes('migraine') ||
        textLower.includes('epilepsy') || textLower.includes('parkinson')) {
      return 'Neurology';
    }
    
    // Gastroenterology
    if (textLower.includes('stomach') || textLower.includes('gastro') || 
        textLower.includes('digestive') || textLower.includes('bowel') ||
        textLower.includes('liver') || textLower.includes('intestine') ||
        textLower.includes('abdominal') || textLower.includes('nausea')) {
      return 'Gastroenterology';
    }

    // Mental Health
    if (textLower.includes('depression') || textLower.includes('anxiety') ||
        textLower.includes('mental health') || textLower.includes('psychiatric') ||
        textLower.includes('bipolar') || textLower.includes('schizophrenia') ||
        textLower.includes('substance abuse') || textLower.includes('addiction')) {
      return 'Mental Health Conditions and Substance Abuse';
    }

    // OB/GYN
    if (textLower.includes('pregnancy') || textLower.includes('obstetric') ||
        textLower.includes('gynecologic') || textLower.includes('menstrual') ||
        textLower.includes('contraception') || textLower.includes('fertility') ||
        textLower.includes('prenatal') || textLower.includes('postpartum')) {
      return 'Obstetric and Gynecologic Conditions';
    }

    // Infectious Disease
    if (textLower.includes('infection') || textLower.includes('infectious') ||
        textLower.includes('bacterial') || textLower.includes('viral') ||
        textLower.includes('antibiotic') || textLower.includes('sepsis') ||
        textLower.includes('fever') || textLower.includes('immunocompromised')) {
      return 'Infectious Disease';
    }
    
    // Primary Care indicators
    if (textLower.includes('screening') || textLower.includes('prevention') || 
        textLower.includes('primary care') || textLower.includes('wellness') ||
        textLower.includes('physical exam') || textLower.includes('routine') ||
        textLower.includes('vaccination') || textLower.includes('health maintenance')) {
      return 'Primary Care';
    }
    
    return 'General Medicine';
  }

  /**
   * Map ICD-10 codes to specialty
   */
  private static mapICD10CodeToSpecialty(icdCode: string): Specialty {
    const code = icdCode.toUpperCase();
    
    // Major ICD-10 code ranges
    if (code.startsWith('C') || code.startsWith('D0') || code.startsWith('D1') || 
        code.startsWith('D2') || code.startsWith('D3') || code.startsWith('D4')) {
      return 'Oncology'; // Neoplasms
    }
    
    if (code.startsWith('E')) {
      return 'Endocrinology'; // Endocrine, nutritional and metabolic diseases
    }
    
    if (code.startsWith('I')) {
      return 'Cardiology'; // Diseases of the circulatory system
    }
    
    if (code.startsWith('J')) {
      return 'Pulmonology'; // Diseases of the respiratory system
    }
    
    if (code.startsWith('K')) {
      return 'Gastroenterology'; // Diseases of the digestive system
    }
    
    if (code.startsWith('G')) {
      return 'Neurology'; // Diseases of the nervous system
    }
    
    if (code.startsWith('M')) {
      return 'Rheumatology'; // Diseases of the musculoskeletal system
    }
    
    if (code.startsWith('F')) {
      return 'Mental Health Conditions and Substance Abuse'; // Mental and behavioral disorders
    }
    
    if (code.startsWith('O') || code.startsWith('Z3')) {
      return 'Obstetric and Gynecologic Conditions'; // Pregnancy, childbirth and puerperium
    }
    
    if (code.startsWith('A') || code.startsWith('B')) {
      return 'Infectious Disease'; // Certain infectious and parasitic diseases
    }
    
    return 'General Medicine';
  }

  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dateOfBirth: string): number {
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 0;
    }
  }

  /**
   * Get a user-friendly explanation for why a specialty was suggested
   */
  static getSpecialtySuggestionReason(
    patient: Patient,
    suggestedSpecialty: Specialty,
    recentEncounters?: Encounter[],
    recentDiagnoses?: Diagnosis[]
  ): string {
    // Check alerts
    if (patient.alerts && patient.alerts.length > 0) {
      for (const alert of patient.alerts) {
        if (alert.type === 'oncology' && suggestedSpecialty === 'Oncology') {
          return 'Based on oncology-related alert';
        }
        if ((alert.type === 'autoimmune' || alert.type === 'inflammatory') && suggestedSpecialty === 'Rheumatology') {
          return 'Based on autoimmune/inflammatory alert';
        }
      }
    }

    // Check diagnoses
    if (recentDiagnoses && recentDiagnoses.length > 0) {
      const diagnosisTerms = recentDiagnoses
        .filter(d => d.description)
        .map(d => d.description!)
        .join(', ');
      
      if (diagnosisTerms) {
        return `Based on recent diagnosis: ${diagnosisTerms.substring(0, 50)}${diagnosisTerms.length > 50 ? '...' : ''}`;
      }
    }

    // Check encounter reasons
    if (recentEncounters && recentEncounters.length > 0) {
      const reasons = recentEncounters
        .filter(e => e.reasonDisplayText || e.reasonCode)
        .map(e => e.reasonDisplayText || e.reasonCode)
        .join(', ');
      
      if (reasons) {
        return `Based on recent encounter: ${reasons.substring(0, 50)}${reasons.length > 50 ? '...' : ''}`;
      }
    }

    // Age-based
    if (patient.dateOfBirth) {
      const age = this.calculateAge(patient.dateOfBirth);
      if (age >= 65 && suggestedSpecialty === 'Primary Care') {
        return 'Suggested for preventive care (age 65+)';
      }
    }

    return 'Based on patient profile';
  }
} 