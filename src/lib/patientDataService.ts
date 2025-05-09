import { Patient, Admission, Diagnosis, LabResult } from './types';

// Helper function to parse TSV data (can be made more robust)
function parseTSV(tsvText: string): any[] {
  if (!tsvText || !tsvText.trim()) return [];
  const lines = tsvText.trim().split('\n');
  if (lines.length < 2) return []; // Header + at least one data row

  const header = lines[0].split('\t').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    // Ensure row has same number of columns as header, pad with empty strings if not
    const paddedValues = [...values];
    while (paddedValues.length < header.length) {
      paddedValues.push('');
    }
    const rowObject = header.reduce((obj: any, colName: string, index: number) => {
      obj[colName] = paddedValues[index].trim();
      return obj;
    }, {});
    data.push(rowObject);
  }
  return data;
}

/**
 * Service for loading and managing patient data
 */
class PatientDataService {
  private patients: Record<string, Patient> = {};
  private admissions: Record<string, Admission[]> = {}; // PatientID -> Admission[]
  // private diagnoses: Record<string, Diagnosis[]> = {}; // No longer needed if reason is in admission
  // private labResults: Record<string, LabResult[]> = {}; // Assuming labs are still loaded if used elsewhere
  private isLoaded = false;

  /**
   * Load patient data from the provided data files
   */
  async loadPatientData(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      const patientData = await this.fetchPatientData();
      this.processPatientData(patientData);
      this.isLoaded = true;
      console.log(`Loaded ${Object.keys(this.patients).length} patients and their admissions`);
    } catch (error) {
      console.error('Error loading patient data:', error);
      throw new Error('Failed to load patient data');
    }
  }

  /**
   * Fetch patient data from the ENRICHED static files
   */
  private async fetchPatientData(): Promise<{patients: any[], admissions: any[]}> {
    // In a real app, these would be API calls or direct DB reads
    // For MVP, fetch and parse the enriched TSV files.
    // Note: This uses 'fetch' which is browser-based. For server-side rendering
    // or Node.js context, file system reads ('fs' module) would be used.
    // Assuming this service runs in a context where fetch is available (e.g., client-side or Next.js API route)
    
    let patientsArray: any[] = [];
    let admissionsArray: any[] = [];

    try {
      // Adjust path if your files are served from a different public path
      const patientsResponse = await fetch('/data/100-patients/Enriched_Patients.tsv');
      if (!patientsResponse.ok) throw new Error(`Failed to fetch Enriched_Patients.tsv: ${patientsResponse.statusText}`);
      const patientsTSV = await patientsResponse.text();
      patientsArray = parseTSV(patientsTSV);
    } catch (e) {
      console.error("Error fetching or parsing Enriched_Patients.tsv:", e);
      // Fallback to empty or throw, depending on desired resilience
    }

    try {
      const admissionsResponse = await fetch('/data/100-patients/Enriched_Admissions.tsv');
      if (!admissionsResponse.ok) throw new Error(`Failed to fetch Enriched_Admissions.tsv: ${admissionsResponse.statusText}`);
      const admissionsTSV = await admissionsResponse.text();
      admissionsArray = parseTSV(admissionsTSV);
    } catch (e) {
      console.error("Error fetching or parsing Enriched_Admissions.tsv:", e);
    }

    // Placeholder for LabResults if they were to be loaded from a file
    // const labResultsArray = []; 

    return {
      patients: patientsArray,
      admissions: admissionsArray,
      // diagnoses: [], // Diagnoses info is now part of admission's reason
      // labResults: labResultsArray 
    };
  }

  /**
   * Process the patient data and organize it into the appropriate data structures
   */
  private processPatientData(data: {patients: any[], admissions: any[]}): void {
    this.patients = {};
    this.admissions = {};

    // Process patients from Enriched_Patients.tsv
    data.patients.forEach((pData: any) => {
      const patient: Patient = {
        id: pData.PatientID,
        name: pData.name, // From generated name
        firstName: pData.firstName,
        lastName: pData.lastName,
        gender: pData.PatientGender,
        dateOfBirth: pData.PatientDateOfBirth, // Ensure this is in a consistent format
        race: pData.PatientRace,
        maritalStatus: pData.PatientMaritalStatus,
        language: pData.PatientLanguage,
        povertyPercentage: parseFloat(pData.PatientPopulationPercentageBelowPoverty) || 0,
        // photo will be added by demo patient overlay if available
      };
      this.patients[patient.id] = patient;
    });

    // Process admissions from Enriched_Admissions.tsv
    data.admissions.forEach((aData: any) => {
      const admission: Admission = {
        id: aData.AdmissionID,
        patientId: aData.PatientID,
        scheduledStart: aData.ScheduledStartDateTime, // From Python script
        scheduledEnd: aData.ScheduledEndDateTime,   // From Python script
        actualStart: aData.ActualStartDateTime,     // From Python script
        actualEnd: aData.ActualEndDateTime,       // From Python script
        reason: aData.ReasonForVisit,             // From Python script (PrimaryDiagnosisDescription)
        // other fields like primaryDiagnosisCode could be added if needed
      };
      if (!this.admissions[admission.patientId]) {
        this.admissions[admission.patientId] = [];
      }
      this.admissions[admission.patientId].push(admission);
    });

    // Overlay specific data for the three demo patients (Maria, James, Priya)
    // This ensures their specific photos, upcoming appointment details, and potentially
    // more curated reasons for visit for the demo are preserved or enhanced.

    const demoPatientsData = [
      {
        id: '1', name: 'Maria Gomez', firstName: 'Maria', lastName: 'Gomez', gender: 'Female',
        dateOfBirth: '1988-04-17', photo: 'https://i.pravatar.cc/60?u=mg',
        upcomingAdmission: {
          id: 'demo-upcoming-1', patientId: '1',
          scheduledStart: '2026-02-15 10:00:00.000', scheduledEnd: '2026-02-15 10:40:00.000',
          actualStart: '', actualEnd: '', // Can be empty if not yet occurred
          reason: 'Follow-up appointment'
        }
      },
      {
        id: '2', name: 'James Lee', firstName: 'James', lastName: 'Lee', gender: 'Male',
        dateOfBirth: '1972-11-05', photo: 'https://i.pravatar.cc/60?u=jl',
        upcomingAdmission: {
          id: 'demo-upcoming-2', patientId: '2',
          scheduledStart: '2026-03-18 11:30:00.000', scheduledEnd: '2026-03-18 12:10:00.000',
          actualStart: '', actualEnd: '',
          reason: 'Pulmonary check'
        }
      },
      {
        id: '3', name: 'Priya Patel', firstName: 'Priya', lastName: 'Patel', gender: 'Female',
        dateOfBirth: '1990-07-09', photo: 'https://i.pravatar.cc/60?u=pp',
        upcomingAdmission: {
          id: 'demo-upcoming-3', patientId: '3',
          scheduledStart: '2026-04-12 14:00:00.000', scheduledEnd: '2026-04-12 14:40:00.000',
          actualStart: '', actualEnd: '',
          reason: 'Weight-loss follow-up'
        }
      },
    ];

    demoPatientsData.forEach(demoPatient => {
      const { upcomingAdmission, ...patientCoreDetails } = demoPatient;
      // Update or add patient, ensuring not to spread undefined upcomingAdmission into patient object
      if (this.patients[patientCoreDetails.id]) {
        this.patients[patientCoreDetails.id] = {
          ...this.patients[patientCoreDetails.id],
          ...patientCoreDetails,
        };
      } else {
        this.patients[patientCoreDetails.id] = patientCoreDetails as Patient;
      }

      if (upcomingAdmission) {
        if (!this.admissions[patientCoreDetails.id]) {
          this.admissions[patientCoreDetails.id] = [];
        }
        this.admissions[patientCoreDetails.id] = this.admissions[patientCoreDetails.id].filter(adm => adm.id !== upcomingAdmission.id);
        this.admissions[patientCoreDetails.id].push(upcomingAdmission as Admission);
      }
    });
  }

  /**
   * Get all patients
   */
  getAllPatients(): Patient[] {
    // Name is now directly from Enriched_Patients.tsv or demo overlay
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
   * Get comprehensive data for a specific patient, including their admissions.
   * Note: For this version, diagnoses and labResults per admission are returned as empty arrays
   * as the pre-enriched data focuses on having a primary reason for visit in the admission itself.
   */
  getPatientData(patientId: string): any | null {
    const patient = this.getPatient(patientId);
    if (!patient) {
      console.warn(`getPatientData: Patient not found for ID ${patientId}`);
      return null;
    }

    const patientAdmissions = this.getPatientAdmissions(patientId);
    
    const admissionDetails = patientAdmissions.map(admission => {
      // For now, return empty arrays for detailed diagnoses and lab results
      // as the primary reason is already on the admission object.
      // This can be expanded if components need more detailed lists.
      return {
        admission,
        diagnoses: [], // Placeholder
        labResults: []  // Placeholder
      };
    });
    
    return {
      patient,
      admissions: admissionDetails
    };
  }

  /**
   * Get list of upcoming consultations across all patients
   */
  getUpcomingConsultations(): { patient: Patient; visit: Admission }[] {
    const now = new Date();
    const upcoming: { patient: Patient; visit: Admission }[] = [];
    
    Object.values(this.patients).forEach(patient => {
      const patientAdmissions = this.admissions[patient.id] || [];
      patientAdmissions.forEach((visit) => {
        if (visit.scheduledStart && new Date(visit.scheduledStart) > now) {
          upcoming.push({ patient, visit });
        }
      });
    });
    
    upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
    return upcoming;
  }
  
  /**
   * Return every admission paired with its patient (may be null if patient record missing, though less likely now)
   */
  getAllAdmissions(): { patient: Patient | null; admission: Admission }[] {
    const list: { patient: Patient | null; admission: Admission }[] = [];
    Object.entries(this.admissions).forEach(([patientId, patientScopedAdmissions]) => {
      const patient = this.getPatient(patientId); // Should find patient from enriched list
      patientScopedAdmissions.forEach((ad) => {
        list.push({ patient, admission: ad });
      });
    });
    return list;
  }

  // Methods like searchPatients, hasAutoimmuneDiagnosis, hasOncologyDiagnosis would continue
  // to work on the unified this.patients and this.admissions data.
  // ... (other methods from original file can be re-added if needed, e.g., lab results, specific diagnoses)
}

// Export as singleton
export const patientDataService = new PatientDataService();
