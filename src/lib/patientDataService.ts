import { Patient, Admission, Diagnosis, LabResult, Treatment, ComplexCaseAlert } from './types';

// Helper function to parse TSV data (can be made more robust)
function parseTSV(tsvText: string): any[] {
  if (!tsvText || !tsvText.trim()) return [];
  const lines = tsvText.trim().split('\n');
  if (lines.length < 2) return []; // Header + at least one data row

  const raw_header = lines[0].split('\t');
  const header = raw_header.map(h => h.trim());
  // ##### DEBUG LOG #####
  // console.log("DEBUG SERVICE: TSV Header in parseTSV:", header);
  // This will be captured by the tool's print if the calling function prints it.
  // For direct visibility if this function is called multiple times, we'd need a different strategy
  // but patientDataService calls it once per file.

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

// Mock data to be integrated - In a real app, this might come from a config or separate JSON files
const MOCK_TRANSCRIPTS: Record<string, Record<string, string>> = { // patientId -> admissionId -> transcript string
  '1': { 'demo-upcoming-1': "Dr.: How have you been feeling since your last visit?\nMaria: Still tired all the time and my hands ache in the morning.\nDr.: Any swelling or redness in the joints?\nMaria: Some swelling, yes." },
};

const MOCK_SOAP_NOTES: Record<string, Record<string, string>> = { // patientId -> admissionId -> SOAP string
  '1': { 'demo-upcoming-1': "S: 38-year-old female with 6-month history of symmetric hand pain and morning stiffness (90 min). Denies fever or rash.\nO: MCP and PIP joints tender on palpation, mild edema. ESR 38 mm/h, CRP 18 mg/L, RF positive, anti-CCP strongly positive.\nA: Early rheumatoid arthritis highly likely [1].\nP: Initiate methotrexate 15 mg weekly with folic acid 1 mg daily. Order baseline LFTs, schedule ultrasound of hands in 6 weeks. Discuss exercise and smoking cessation." },
};

const MOCK_TREATMENTS_FOR_DEMO_ADMISSIONS: Record<string, Record<string, Treatment[]>> = { // patientId -> admissionId -> Treatment[]
  '1': {
    'demo-upcoming-1': [
      { drug: "Methotrexate 15 mg weekly", status: "Proposed", rationale: "First-line csDMARD per ACR 2023 guidelines after NSAID failure [3]" },
      { drug: "Folic acid 1 mg daily", status: "Supportive", rationale: "Reduces MTX-induced GI adverse effects [4]" },
    ]
  }
};

const MOCK_LAB_DETAILS_FOR_DEMO_PATIENT_1: Record<string, { referenceRange?: string, flag?: string }> = {
  // Assuming LabName is the key for patient '1', admission 'demo-upcoming-1'
  "ESR": { referenceRange: "<20", flag: "H" },
  "CRP": { referenceRange: "<5", flag: "H" },
  "RF": { referenceRange: "Neg", flag: "H" },
  "anti-CCP": { referenceRange: "Neg", flag: "H" },
};

const MOCK_PRIOR_AUTH_JUSTIFICATION_PATIENT1_DEMO1 = "Failed NSAIDs, elevated CRP 18 mg/L and positive RF/anti-CCP. Methotrexate is first-line DMARD.";

/**
 * Service for loading and managing patient data
 */
class PatientDataService {
  private patients: Record<string, Patient> = {};
  private admissions: Record<string, Admission[]> = {}; // PatientID -> Admission[]
  private allDiagnosesByAdmission: Record<string, Diagnosis[]> = {}; // Key: patientId_admissionId
  private allLabResultsByAdmission: Record<string, LabResult[]> = {}; // Key: patientId_admissionId
  private isLoaded = false;
  public debugMessages: string[] = []; // Changed to instance member

  /**
   * Load patient data from the provided data files
   */
  async loadPatientData(): Promise<void> {
    this.debugMessages = []; // Clear messages on new load
    // Simplified load logic for debugging - always try to load for now
    // if (this.isLoaded && this.patients && Object.keys(this.patients).length > 0) {
    //   this.debugMessages.push("PRINT_DEBUG SERVICE: Data already loaded. Attempted redundant load.");
    //   return;
    // }
    this.isLoaded = false; 
    this.debugMessages.push("PRINT_DEBUG SERVICE: loadPatientData called.");

    try {
      const rawData = await this.fetchRawData();
      this.debugMessages.push(`PRINT_DEBUG SERVICE: fetchRawData returned - Patients: ${rawData.patients?.length || 0}, Admissions: ${rawData.admissions?.length || 0}, Diagnoses: ${rawData.diagnoses?.length || 0}, Labs: ${rawData.labResults?.length || 0}`);
      this.processRawData(rawData);
      this.isLoaded = true; 
      this.debugMessages.push(`PRINT_DEBUG SERVICE: Successfully loaded and processed data. Patients in map: ${Object.keys(this.patients).length}`);
    } catch (error: any) {
      console.error('Error loading patient data:', error);
      this.debugMessages.push(`PRINT_DEBUG SERVICE: Error in loadPatientData: ${error.message}`);
      this.isLoaded = false; 
      // throw new Error('Failed to load patient data'); // Avoid throwing to see debug messages
    }
  }

  /**
   * Fetch patient data from the ENRICHED static files
   */
  private async fetchRawData(): Promise<{
    patients: any[], 
    admissions: any[], 
    diagnoses: any[], 
    labResults: any[]
  }> {
    this.debugMessages.push("PRINT_DEBUG SERVICE: fetchRawData started.");
    let patientsArray: any[] = [];
    let admissionsArray: any[] = [];
    let diagnosesArray: any[] = [];
    let labResultsArray: any[] = [];

    try {
      this.debugMessages.push("PRINT_DEBUG SERVICE: Fetching Enriched_Patients.tsv...");
      const patientsResponse = await fetch('/data/100-patients/Enriched_Patients.tsv');
      this.debugMessages.push(`PRINT_DEBUG SERVICE: Enriched_Patients.tsv response ok: ${patientsResponse.ok}, status: ${patientsResponse.status}`);
      if (patientsResponse.ok) {
        const patientsTSV = await patientsResponse.text();
        this.debugMessages.push(`PRINT_DEBUG SERVICE: Enriched_Patients.tsv text (first 300 chars): ${patientsTSV.substring(0, 300)}`);
        patientsArray = parseTSV(patientsTSV);
        this.debugMessages.push(`PRINT_DEBUG SERVICE: Enriched_Patients.tsv parsed count: ${patientsArray.length}`);
      } else {
        this.debugMessages.push(`PRINT_DEBUG SERVICE: Failed to fetch Enriched_Patients.tsv`);
      }
    } catch (e: any) { this.debugMessages.push(`PRINT_DEBUG SERVICE: Exception fetching/parsing Enriched_Patients.tsv: ${e.message}`); console.error("Fetch/Parse Enriched_Patients.tsv:", e); }

    try {
      this.debugMessages.push("PRINT_DEBUG SERVICE: Fetching Enriched_Admissions.tsv...");
      const admissionsResponse = await fetch('/data/100-patients/Enriched_Admissions.tsv');
       this.debugMessages.push(`PRINT_DEBUG SERVICE: Enriched_Admissions.tsv response ok: ${admissionsResponse.ok}, status: ${admissionsResponse.status}`);
      if (admissionsResponse.ok) {
        const admissionsTSV = await admissionsResponse.text();
        this.debugMessages.push(`PRINT_DEBUG SERVICE: Enriched_Admissions.tsv text (first 300 chars): ${admissionsTSV.substring(0,300)}`);
        admissionsArray = parseTSV(admissionsTSV);
        this.debugMessages.push(`PRINT_DEBUG SERVICE: Enriched_Admissions.tsv parsed count: ${admissionsArray.length}`);
      } else {
         this.debugMessages.push(`PRINT_DEBUG SERVICE: Failed to fetch Enriched_Admissions.tsv`);
      }
    } catch (e: any) { this.debugMessages.push(`PRINT_DEBUG SERVICE: Exception fetching/parsing Enriched_Admissions.tsv: ${e.message}`); console.error("Fetch/Parse Enriched_Admissions.tsv:", e); }
    
    try {
      const diagnosesResponse = await fetch('/data/100-patients/AdmissionsDiagnosesCorePopulatedTable.txt');
      if (!diagnosesResponse.ok) throw new Error(`Failed to fetch AdmissionsDiagnosesCorePopulatedTable.txt: ${diagnosesResponse.statusText}`);
      diagnosesArray = parseTSV(await diagnosesResponse.text());
    } catch (e) { console.error("Error fetching/parsing AdmissionsDiagnosesCorePopulatedTable.txt:", e); }

    try {
      const labsResponse = await fetch('/data/100-patients/LabsCorePopulatedTable.txt');
      if (!labsResponse.ok) throw new Error(`Failed to fetch LabsCorePopulatedTable.txt: ${labsResponse.statusText}`);
      labResultsArray = parseTSV(await labsResponse.text());
    } catch (e) { console.error("Error fetching/parsing LabsCorePopulatedTable.txt:", e); }

    return { patients: patientsArray, admissions: admissionsArray, diagnoses: diagnosesArray, labResults: labResultsArray };
  }

  /**
   * Process the patient data and organize it into the appropriate data structures
   */
  private processRawData(data: {
    patients: any[], 
    admissions: any[], 
    diagnoses: any[], 
    labResults: any[]
  }): void {
    this.patients = {};
    this.admissions = {};
    this.allDiagnosesByAdmission = {};
    this.allLabResultsByAdmission = {};

    this.debugMessages.push(`PRINT_DEBUG SERVICE: processRawData received patients: ${data.patients?.length || 0}`);

    const targetPatientId1 = 'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F';
    // const targetPatientId2 = '64182B95-EB72-4E2B-BE77-8050B71498CE'; // For brevity, focus on one target

    data.patients.forEach((pData: any) => {
      if (!pData.PatientID) {
        console.log("PRINT_DEBUG SERVICE: Row in Enriched_Patients.tsv missing PatientID:", pData);
        return; 
      }
      // ##### DEBUG LOG for target patients raw data from TSV #####
      if (pData.PatientID === 'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F' || pData.PatientID === '64182B95-EB72-4E2B-BE77-8050B71498CE') {
        console.log(`PRINT_DEBUG SERVICE: Raw pData for ${pData.PatientID}:`, JSON.stringify(pData));
      }

      let parsedAlerts: ComplexCaseAlert[] = [];
      if (pData.alertsJSON && pData.alertsJSON.trim() !== "" && pData.alertsJSON.trim() !== "[]") {
        try {
          const alertsFromFile = JSON.parse(pData.alertsJSON);
          if (Array.isArray(alertsFromFile)) {
            parsedAlerts = alertsFromFile.filter(al => al && typeof al.id === 'string' && typeof al.msg === 'string');
          }
        } catch (e: any) {
          console.error(`Error parsing alertsJSON for patient ${pData.PatientID}:`, e, pData.alertsJSON);
        }
      }
      const patient: Patient = {
        id: pData.PatientID.trim(),
        name: pData.name,
        firstName: pData.firstName,
        lastName: pData.lastName,
        gender: pData.PatientGender,
        dateOfBirth: pData.PatientDateOfBirth,
        race: pData.PatientRace,
        maritalStatus: pData.PatientMaritalStatus,
        language: pData.PatientLanguage,
        povertyPercentage: parseFloat(pData.PatientPopulationPercentageBelowPoverty) || 0,
        alerts: parsedAlerts.length > 0 ? parsedAlerts : undefined,
        photo: undefined 
      };
      this.patients[patient.id] = patient;
    });

    const loadedPatientIdsFromFile = Object.keys(this.patients);
    this.debugMessages.push(`PRINT_DEBUG SERVICE: Count of patients loaded from Enriched_Patients.tsv: ${loadedPatientIdsFromFile.length}`);
    const patient1FromFile = this.patients[targetPatientId1];
    this.debugMessages.push(`PRINT_DEBUG SERVICE: Target Patient 1 (FB2...) from file load - Alerts: ${patient1FromFile ? JSON.stringify(patient1FromFile.alerts) : "NOT FOUND IN MAP POST-FILE-LOAD"}`);
    
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

    data.diagnoses.forEach((dxData: any) => {
      if (!dxData.PatientID || !dxData.AdmissionID) return; // Basic validation
      const key = `${dxData.PatientID}_${dxData.AdmissionID}`;
      const diagnosis: Diagnosis = {
        patientId: dxData.PatientID,
        admissionId: dxData.AdmissionID,
        code: dxData.PrimaryDiagnosisCode, // Assuming this is the structure
        description: dxData.PrimaryDiagnosisDescription
      };
      if (!this.allDiagnosesByAdmission[key]) {
        this.allDiagnosesByAdmission[key] = [];
      }
      this.allDiagnosesByAdmission[key].push(diagnosis);
    });

    data.labResults.forEach((labData: any) => {
       if (!labData.PatientID || !labData.AdmissionID) return; // Basic validation
       const key = `${labData.PatientID}_${labData.AdmissionID}`;
       // Assuming TSV headers for labs are: PatientID, AdmissionID, LabTestName, LabTestValue, LabTestUnits, LabDateTime
       const labResult: LabResult = {
         patientId: labData.PatientID,
         admissionId: labData.AdmissionID,
         name: labData.LabName, // Corrected based on file header
         value: parseFloat(labData.LabValue) || labData.LabValue, // Corrected based on file header
         units: labData.LabUnits, // Corrected based on file header
         dateTime: labData.LabDateTime // Corrected based on file header
       };
       if (!this.allLabResultsByAdmission[key]) {
         this.allLabResultsByAdmission[key] = [];
       }
       this.allLabResultsByAdmission[key].push(labResult);
    });

    // Overlay specific data for the three demo patients (Maria, James, Priya)
    // This ensures their specific photos, upcoming appointment details, and potentially
    // more curated reasons for visit for the demo are preserved or enhanced.

    const demoPatientsConfig = [
      {
        id: '1', name: 'Maria Gomez', firstName: 'Maria', lastName: 'Gomez', gender: 'Female',
        dateOfBirth: '1988-04-17', photo: 'https://i.pravatar.cc/60?u=mg',
        demoUpcomingAdmission: {
          id: 'demo-upcoming-1', patientId: '1',
          scheduledStart: '2026-02-15 10:00:00.000', scheduledEnd: '2026-02-15 10:40:00.000',
          actualStart: '', actualEnd: '', 
          reason: 'Follow-up appointment',
          transcript: MOCK_TRANSCRIPTS['1']?.['demo-upcoming-1'],
          soapNote: MOCK_SOAP_NOTES['1']?.['demo-upcoming-1'],
          treatments: MOCK_TREATMENTS_FOR_DEMO_ADMISSIONS['1']?.['demo-upcoming-1'],
          priorAuthJustification: MOCK_PRIOR_AUTH_JUSTIFICATION_PATIENT1_DEMO1
        }
      },
      {
        id: '2', name: 'James Lee', firstName: 'James', lastName: 'Lee', gender: 'Male',
        dateOfBirth: '1972-11-05', photo: 'https://i.pravatar.cc/60?u=jl',
        demoUpcomingAdmission: {
          id: 'demo-upcoming-2', patientId: '2',
          scheduledStart: '2026-03-18 11:30:00.000', scheduledEnd: '2026-03-18 12:10:00.000',
          actualStart: '', actualEnd: '',
          reason: 'Pulmonary check'
        }
      },
      {
        id: '3', name: 'Priya Patel', firstName: 'Priya', lastName: 'Patel', gender: 'Female',
        dateOfBirth: '1990-07-09', photo: 'https://i.pravatar.cc/60?u=pp',
        demoUpcomingAdmission: {
          id: 'demo-upcoming-3', patientId: '3',
          scheduledStart: '2026-04-12 14:00:00.000', scheduledEnd: '2026-04-12 14:40:00.000',
          actualStart: '', actualEnd: '',
          reason: 'Weight-loss follow-up'
        }
      },
    ];

    demoPatientsConfig.forEach(demoConfig => {
      const { demoUpcomingAdmission, ...patientCoreDetails } = demoConfig;
      // Update or add patient, ensuring not to spread undefined upcomingAdmission into patient object
      if (this.patients[patientCoreDetails.id]) {
        this.patients[patientCoreDetails.id] = {
          ...this.patients[patientCoreDetails.id],
          ...patientCoreDetails,
        };
      } else {
        this.patients[patientCoreDetails.id] = patientCoreDetails as Patient;
      }

      if (demoUpcomingAdmission) {
        if (!this.admissions[patientCoreDetails.id]) {
          this.admissions[patientCoreDetails.id] = [];
        }
        this.admissions[patientCoreDetails.id] = this.admissions[patientCoreDetails.id].filter(adm => adm.id !== demoUpcomingAdmission.id);
        const admissionToPush: Admission = {
          ...demoUpcomingAdmission,
          // Ensure all fields of Admission type are present if not in demoUpcomingAdmission
          actualStart: demoUpcomingAdmission.actualStart || '',
          actualEnd: demoUpcomingAdmission.actualEnd || '',
        } as Admission;
        this.admissions[patientCoreDetails.id].push(admissionToPush);

        // If this is patient '1' and it's their demo admission, augment their labs
        if (patientCoreDetails.id === '1' && demoUpcomingAdmission.id === 'demo-upcoming-1') {
          const admissionKey = `${patientCoreDetails.id}_${demoUpcomingAdmission.id}`;
          if (this.allLabResultsByAdmission[admissionKey]) {
            this.allLabResultsByAdmission[admissionKey].forEach(lab => {
              const mockDetail = MOCK_LAB_DETAILS_FOR_DEMO_PATIENT_1[lab.name];
              if (mockDetail) {
                lab.referenceRange = mockDetail.referenceRange;
                lab.flag = mockDetail.flag;
              }
            });
          } else { // If no labs were loaded from file for this demo admission, create them from mock
            this.allLabResultsByAdmission[admissionKey] = Object.entries(MOCK_LAB_DETAILS_FOR_DEMO_PATIENT_1)
              .map(([labName, details]) => ({
                patientId: '1',
                admissionId: 'demo-upcoming-1',
                name: labName,
                value: "N/A", // Or fetch from a more complete mock if needed
                units: "N/A",
                dateTime: new Date().toISOString(), // Placeholder
                referenceRange: details.referenceRange,
                flag: details.flag
              } as LabResult));
          }
        }
      }
    });

    this.debugMessages.push(`PRINT_DEBUG SERVICE: Patient IDs AFTER demo overlay: ${Object.keys(this.patients).length}`);
    const patient1AfterOverlay = this.patients[targetPatientId1];
    this.debugMessages.push(`PRINT_DEBUG SERVICE: Target Patient 1 (FB2...) AFTER demo overlay - Alerts: ${patient1AfterOverlay ? JSON.stringify(patient1AfterOverlay.alerts) : "NOT FOUND IN MAP POST-OVERLAY"}`);
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
    const patientAdmissions = this.getPatientAdmissions(patientId) || [];
    const admissionDetails = patientAdmissions.map(admission => {
      const key = `${patient.id}_${admission.id}`;
      return {
        admission,
        diagnoses: this.allDiagnosesByAdmission[key] || [],
        labResults: this.allLabResultsByAdmission[key] || []
      };
    });
    return { patient, admissions: admissionDetails };
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
