import { Patient, Admission, Diagnosis, LabResult } from './types';

/**
 * Service for loading and managing patient data
 */
class PatientDataService {
  private patients: Record<string, Patient> = {};
  private admissions: Record<string, Admission[]> = {};
  private diagnoses: Record<string, Diagnosis[]> = {};
  private labResults: Record<string, LabResult[]> = {};
  private isLoaded = false;

  /**
   * Load patient data from the provided data files
   */
  async loadPatientData(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      // In a production environment, this would load from an API or database
      // For the MVP, we'll load the data from the static files
      const patientData = await this.fetchPatientData();
      this.processPatientData(patientData);
      this.isLoaded = true;
      console.log(`Loaded ${Object.keys(this.patients).length} patients`);
    } catch (error) {
      console.error('Error loading patient data:', error);
      throw new Error('Failed to load patient data');
    }
  }

  /**
   * Fetch patient data from the static files
   * In production, this would be replaced with API calls
   */
  private async fetchPatientData(): Promise<any> {
    // This is a placeholder for the MVP
    // In production, this would fetch from an API
    
    // For demo purposes, we'll return a sample of the data
    // that would be parsed from the files
    return {
      patients: [
        {
          id: 'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F',
          gender: 'Male',
          dateOfBirth: '1947-12-28 02:45:40.547',
          race: 'Unknown',
          maritalStatus: 'Married',
          language: 'Icelandic',
          povertyPercentage: 18.08
        },
        {
          id: '64182B95-EB72-4E2B-BE77-8050B71498CE',
          gender: 'Male',
          dateOfBirth: '1952-01-18 19:51:12.917',
          race: 'African American',
          maritalStatus: 'Separated',
          language: 'English',
          povertyPercentage: 13.03
        },
        // Additional patients would be loaded here
      ],
      admissions: [
        {
          id: '7',
          patientId: '7A025E77-7832-4F53-B9A7-09A3F98AC17E',
          startDate: '2011-10-12 14:55:02.027',
          endDate: '2011-10-22 01:16:07.557'
        },
        {
          id: '1',
          patientId: 'DCE5AEB8-6DB9-4106-8AE4-02CCC5C23741',
          startDate: '1993-02-11 18:57:04.003',
          endDate: '1993-02-24 17:22:29.713'
        },
        // Additional admissions would be loaded here
      ],
      diagnoses: [
        {
          patientId: '80AC01B2-BD55-4BE0-A59A-4024104CF4E9',
          admissionId: '2',
          code: 'M01.X',
          description: 'Direct infection of joint in infectious and parasitic diseases classified elsewhere'
        },
        {
          patientId: '80AC01B2-BD55-4BE0-A59A-4024104CF4E9',
          admissionId: '5',
          code: 'M05.51',
          description: 'Rheumatoid polyneuropathy with rheumatoid arthritis of shoulder'
        },
        // Additional diagnoses would be loaded here
      ],
      labResults: [
        {
          patientId: '1A8791E3-A61C-455A-8DEE-763EB90C9B2C',
          admissionId: '1',
          name: 'URINALYSIS: RED BLOOD CELLS',
          value: 1.8,
          units: 'rbc/hpf',
          dateTime: '1992-07-01 01:36:17.910'
        },
        {
          patientId: '1A8791E3-A61C-455A-8DEE-763EB90C9B2C',
          admissionId: '1',
          name: 'METABOLIC: GLUCOSE',
          value: 103.3,
          units: 'mg/dL',
          dateTime: '1992-06-30 09:35:52.383'
        },
        // Additional lab results would be loaded here
      ]
    };
  }

  /**
   * Process the patient data and organize it into the appropriate data structures
   */
  private processPatientData(data: any): void {
    // Process patients
    data.patients.forEach((patient: Patient) => {
      this.patients[patient.id] = patient;
    });

    // Process admissions
    data.admissions.forEach((admission: Admission) => {
      if (!this.admissions[admission.patientId]) {
        this.admissions[admission.patientId] = [];
      }
      this.admissions[admission.patientId].push(admission);
    });

    // Process diagnoses
    data.diagnoses.forEach((diagnosis: Diagnosis) => {
      const key = `${diagnosis.patientId}_${diagnosis.admissionId}`;
      if (!this.diagnoses[key]) {
        this.diagnoses[key] = [];
      }
      this.diagnoses[key].push(diagnosis);
    });

    // Process lab results
    data.labResults.forEach((labResult: LabResult) => {
      const key = `${labResult.patientId}_${labResult.admissionId}`;
      if (!this.labResults[key]) {
        this.labResults[key] = [];
      }
      this.labResults[key].push(labResult);
    });
  }

  /**
   * Get all patients
   */
  getAllPatients(): Patient[] {
    return Object.values(this.patients);
  }

  /**
   * Get a specific patient by ID
   */
  getPatient(patientId: string): Patient | null {
    return this.patients[patientId] || null;
  }

  /**
   * Get all admissions for a specific patient
   */
  getPatientAdmissions(patientId: string): Admission[] {
    return this.admissions[patientId] || [];
  }

  /**
   * Get all diagnoses for a specific patient and admission
   */
  getPatientDiagnoses(patientId: string, admissionId: string): Diagnosis[] {
    const key = `${patientId}_${admissionId}`;
    return this.diagnoses[key] || [];
  }

  /**
   * Get all lab results for a specific patient and admission
   */
  getPatientLabResults(patientId: string, admissionId: string): LabResult[] {
    const key = `${patientId}_${admissionId}`;
    return this.labResults[key] || [];
  }

  /**
   * Get comprehensive data for a specific patient
   */
  getPatientData(patientId: string): any {
    const patient = this.getPatient(patientId);
    if (!patient) return null;

    const patientAdmissions = this.getPatientAdmissions(patientId);
    
    // Get diagnoses and lab results for each admission
    const admissionDetails = patientAdmissions.map(admission => {
      const diagnoses = this.getPatientDiagnoses(patientId, admission.id);
      const labResults = this.getPatientLabResults(patientId, admission.id);
      
      return {
        admission,
        diagnoses,
        labResults
      };
    });
    
    return {
      patient,
      admissions: admissionDetails
    };
  }

  /**
   * Search for patients matching the given criteria
   */
  searchPatients(criteria: Partial<Patient>): Patient[] {
    return Object.values(this.patients).filter(patient => {
      for (const [key, value] of Object.entries(criteria)) {
        if (patient[key as keyof Patient] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Check if a patient has any autoimmune or inflammatory conditions
   */
  hasAutoimmuneDiagnosis(patientId: string): boolean {
    const patientAdmissions = this.getPatientAdmissions(patientId);
    
    for (const admission of patientAdmissions) {
      const diagnoses = this.getPatientDiagnoses(patientId, admission.id);
      
      for (const diagnosis of diagnoses) {
        // Check for common autoimmune/inflammatory ICD-10 codes
        if (
          diagnosis.code.startsWith('M05') || // Rheumatoid arthritis with rheumatoid factor
          diagnosis.code.startsWith('M06') || // Other rheumatoid arthritis
          diagnosis.code.startsWith('M32') || // Systemic lupus erythematosus
          diagnosis.code.startsWith('M33') || // Dermatopolymyositis
          diagnosis.code.startsWith('M34') || // Systemic sclerosis
          diagnosis.code.startsWith('M35') || // Other systemic involvement of connective tissue
          diagnosis.code.startsWith('K50') || // Crohn's disease
          diagnosis.code.startsWith('K51') || // Ulcerative colitis
          diagnosis.code.startsWith('L40')    // Psoriasis
        ) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check if a patient has any oncology conditions
   */
  hasOncologyDiagnosis(patientId: string): boolean {
    const patientAdmissions = this.getPatientAdmissions(patientId);
    
    for (const admission of patientAdmissions) {
      const diagnoses = this.getPatientDiagnoses(patientId, admission.id);
      
      for (const diagnosis of diagnoses) {
        // Check for common oncology ICD-10 codes (C00-D49)
        if (diagnosis.code.match(/^[CD][0-4][0-9]/)) {
          return true;
        }
      }
    }
    
    return false;
  }
}

// Export as singleton
export const patientDataService = new PatientDataService();
