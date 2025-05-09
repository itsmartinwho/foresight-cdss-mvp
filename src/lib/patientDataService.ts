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
        // Added for past visits
        {
          id: '7A025E77-7832-4F53-B9A7-09A3F98AC17E',
          firstName: 'John',
          lastName: 'Doe (Past)',
          gender: 'Male',
          dateOfBirth: '1960-01-01',
          // No photo to test default icon
        },
        {
          id: 'DCE5AEB8-6DB9-4106-8AE4-02CCC5C23741',
          firstName: 'Jane',
          lastName: 'Smith (Past)',
          gender: 'Female',
          dateOfBirth: '1955-05-05',
          photo: 'https://i.pravatar.cc/60?u=jsmithpast'
        },
        // Additional patients would be loaded here
        // Dashboard demo patients (merged)
        {
          id: '1',
          name: 'Maria Gomez',
          firstName: 'Maria',
          lastName: 'Gomez',
          gender: 'Female',
          dateOfBirth: '1988-04-17',
          race: 'Unknown',
          maritalStatus: 'Unknown',
          language: 'English',
          povertyPercentage: 0,
          nextAppointment: '2025-04-24 09:00',
          reason: 'Fatigue, joint pain',
          photo: 'https://i.pravatar.cc/60?u=mg'
        },
        {
          id: '2',
          name: 'James Lee',
          firstName: 'James',
          lastName: 'Lee',
          gender: 'Male',
          dateOfBirth: '1972-11-05',
          race: 'Unknown',
          maritalStatus: 'Unknown',
          language: 'English',
          povertyPercentage: 0,
          nextAppointment: '2025-04-24 09:30',
          reason: 'Chronic cough',
          photo: 'https://i.pravatar.cc/60?u=jl'
        },
        {
          id: '3',
          name: 'Priya Patel',
          firstName: 'Priya',
          lastName: 'Patel',
          gender: 'Female',
          dateOfBirth: '1990-07-09',
          race: 'Unknown',
          maritalStatus: 'Unknown',
          language: 'English',
          povertyPercentage: 0,
          nextAppointment: '2025-04-24 10:00',
          reason: 'Rash, weight loss',
          photo: 'https://i.pravatar.cc/60?u=pp'
        },
      ],
      admissions: [
        {
          id: '7',
          patientId: '7A025E77-7832-4F53-B9A7-09A3F98AC17E',
          scheduledStart: '2011-10-12 14:55:02.027',
          scheduledEnd: '2011-10-22 01:16:07.557',
          actualStart: '2011-10-12 14:55:02.027',
          actualEnd: '2011-10-22 01:16:07.557',
          reason: 'Historical Checkup A'
        },
        {
          id: '1',
          patientId: 'DCE5AEB8-6DB9-4106-8AE4-02CCC5C23741',
          scheduledStart: '1993-02-11 18:57:04.003',
          scheduledEnd: '1993-02-24 17:22:29.713',
          actualStart: '1993-02-11 18:57:04.003',
          actualEnd: '1993-02-24 17:22:29.713',
          reason: 'Routine Follow-up B'
        },
        // Additional admissions would be loaded here
        // Demo patient upcoming consultations
        {
          id: 'demo-1',
          patientId: '1',
          scheduledStart: '2026-02-15 10:00',
          scheduledEnd: '2026-02-15 10:40',
          reason: 'Follow-up appointment'
        },
        {
          id: 'demo-2',
          patientId: '2',
          scheduledStart: '2026-03-18 11:30',
          scheduledEnd: '2026-03-18 12:10',
          reason: 'Pulmonary check'
        },
        {
          id: 'demo-3',
          patientId: '3',
          scheduledStart: '2026-04-12 14:00',
          scheduledEnd: '2026-04-12 14:40',
          reason: 'Weight-loss follow-up'
        },
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

    // Ensure each admission has a reason; if missing copy first diagnosis description
    Object.entries(this.admissions).forEach(([pid, list]) => {
      list.forEach((admission) => {
        if (!admission.reason || admission.reason.trim() === "") {
          const diagKey = `${pid}_${admission.id}`;
          const firstDx = (this.diagnoses[diagKey] || [])[0];
          if (firstDx) {
            admission.reason = firstDx.description;
          }
        }
      });
    });
  }

  /**
   * Get all patients
   */
  getAllPatients(): Patient[] {
    return Object.values(this.patients).map((p) => {
      if (!p.name && (p as any).firstName) {
        const first = (p as any).firstName;
        const last = (p as any).lastName ?? "";
        return { ...p, name: `${first} ${last}`.trim() } as unknown as Patient;
      }
      return p;
    });
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

  /**
   * Get list of upcoming consultations across all patients
   */
  getUpcomingConsultations(): { patient: Patient; visit: Admission }[] {
    const now = new Date();
    const upcoming: { patient: Patient; visit: Admission }[] = [];
    Object.entries(this.admissions).forEach(([pid, visits]) => {
      const patient = this.patients[pid];
      if (!patient) return;
      visits.forEach((v) => {
        if (new Date(v.scheduledStart) > now) {
          upcoming.push({ patient, visit: v });
        }
      });
    });
    upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
    return upcoming;
  }

  getPastConsultations(patientId: string): Admission[] {
    const now = new Date();
    const visits = this.admissions[patientId] || [];
    return visits.filter((v) => new Date(v.scheduledStart) <= now);
  }

  /**
   * Return every admission paired with its patient (may be null if patient record missing)
   */
  getAllAdmissions(): { patient: Patient | null; admission: Admission }[] {
    const list: { patient: Patient | null; admission: Admission }[] = [];
    Object.entries(this.admissions).forEach(([pid, admissions]) => {
      const patient = this.getPatient(pid);
      admissions.forEach((ad) => list.push({ patient, admission: ad }));
    });
    return list;
  }
}

// Export as singleton
export const patientDataService = new PatientDataService();
