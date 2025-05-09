import { Patient, Admission, Diagnosis, LabResult, Treatment, ComplexCaseAlert } from './types';

// Helper function to parse TSV data (can be made more robust)
function parseTSV(tsvText: string, forFile: string, debugMessagesRef: string[]): any[] {
  // debugMessagesRef.push(`PRINT_DEBUG SERVICE (parseTSV for ${forFile}): Raw text (first 100): ${tsvText.substring(0,100)}`);
  if (!tsvText || !tsvText.trim()) {
    debugMessagesRef.push(`PRINT_DEBUG SERVICE (parseTSV for ${forFile}): Received empty or whitespace-only text.`);
    return [];
  }
  const lines = tsvText.trim().split('\n');
  if (lines.length < 1) { // Allow files with only a header or only data (though header is expected)
     debugMessagesRef.push(`PRINT_DEBUG SERVICE (parseTSV for ${forFile}): No lines after trim/split.`);
    return [];
  }
  const raw_header = lines[0].split('\t');
  const header = raw_header.map(h => h.trim().replace(/\uFEFF/g, '')); // Strip BOM from header keys
  debugMessagesRef.push(`PRINT_DEBUG SERVICE (parseTSV for ${forFile}): Parsed Header: ${JSON.stringify(header)}`);
  
  if (lines.length < 2 && header.length > 0) {
      debugMessagesRef.push(`PRINT_DEBUG SERVICE (parseTSV for ${forFile}): Only header found, no data rows.`);
      return []; // Only header found
  }
  if (header.length === 0 && lines.length > 0) {
       debugMessagesRef.push(`PRINT_DEBUG SERVICE (parseTSV for ${forFile}): No header found, cannot process.`);
      return [];
  }

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    const values = lines[i].split('\t');
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
  public debugMessages: string[] = [];
  private patients: Record<string, Patient> = {};
  private admissions: Record<string, Admission[]> = {};
  private allDiagnosesByAdmission: Record<string, Diagnosis[]> = {};
  private allLabResultsByAdmission: Record<string, LabResult[]> = {};
  private isLoaded = false;

  /**
   * Load patient data from the provided data files
   */
  async loadPatientData(): Promise<void> {
    this.debugMessages = []; 
    this.isLoaded = false; 
    try {
      const rawData = await this.fetchRawData();
      if ((rawData.patients?.length || 0) === 0) {
        this.isLoaded = true; 
        return;
      }
      this.processRawData(rawData);
      this.isLoaded = true; 
    } catch (error: any) { 
      this.isLoaded = false; 
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
    this.debugMessages.push("PRINT_DEBUG SERVICE (fetchRawData): Starting.");
    let patientsArray: any[] = [], admissionsArray: any[] = [], diagnosesArray: any[] = [], labResultsArray: any[] = [];
    const filesToFetch = [
      { name: 'Enriched_Patients.tsv', arrayRef: (arr: any[]) => patientsArray = arr },
      { name: 'Enriched_Admissions.tsv', arrayRef: (arr: any[]) => admissionsArray = arr },
      { name: 'AdmissionsDiagnosesCorePopulatedTable.txt', arrayRef: (arr: any[]) => diagnosesArray = arr },
      { name: 'LabsCorePopulatedTable.txt', arrayRef: (arr: any[]) => labResultsArray = arr }
    ];

    for (const file of filesToFetch) {
      try {
        this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): Fetching ${file.name}...`);
        const response = await fetch(`/data/100-patients/${file.name}`);
        this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): ${file.name} response ok: ${response.ok}, status: ${response.status}`);
        if (response.ok) {
          const tsvText = await response.text();
          this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): ${file.name} text (first 300 chars): ${tsvText.substring(0, 300)}`);
          const parsedData = parseTSV(tsvText, file.name, this.debugMessages);
          file.arrayRef(parsedData);
          this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): ${file.name} parsed count: ${parsedData.length}`);
        } else {
          this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): Failed to fetch ${file.name}`);
        }
      } catch (e: any) { 
        this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): Exception fetching/parsing ${file.name}: ${e.message}`);
        console.error(`Fetch/Parse ${file.name}:`, e);
      }
    }
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

    data.patients.forEach((pData: any) => {
      if (!pData.PatientID) return; 
      
      let parsedAlerts: ComplexCaseAlert[] = [];
      const alertsJsonString = pData['alertsJSON'];
      if (alertsJsonString && typeof alertsJsonString === 'string') {
        let jsonToParse = alertsJsonString.trim();
        if (jsonToParse.length >= 2 && 
            ((jsonToParse.startsWith("'") && jsonToParse.endsWith("'")) || 
             (jsonToParse.startsWith('"') && jsonToParse.endsWith('"')))) {
          jsonToParse = jsonToParse.substring(1, jsonToParse.length - 1);
        }

        if (jsonToParse && jsonToParse !== "[]") {
          try {
            const alertsFromFile = JSON.parse(jsonToParse);
            if (Array.isArray(alertsFromFile)) {
              parsedAlerts = alertsFromFile.filter(al => al && typeof al.id === 'string' && typeof al.msg === 'string');
            }
          } catch (e: any) {
            console.error(`Error parsing alertsJSON for patient ${pData.PatientID}: ${e.message}. Processed string: '${jsonToParse}'. Raw: '${alertsJsonString}'`);
          }
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
        photo: pData.photo || undefined
      };
      this.patients[patient.id] = patient;
    });

    data.admissions.forEach((aData: any) => {
      if (!aData.PatientID || !aData.AdmissionID) return;
      let parsedTreatments: Treatment[] = [];
      const treatmentsJsonString = aData.treatmentsJSON;
      if (treatmentsJsonString && typeof treatmentsJsonString === 'string') {
        let jsonToParse = treatmentsJsonString.trim();
        if (jsonToParse.length >= 2 && 
            ((jsonToParse.startsWith("'") && jsonToParse.endsWith("'")) || 
             (jsonToParse.startsWith('"') && jsonToParse.endsWith('"')))) {
          jsonToParse = jsonToParse.substring(1, jsonToParse.length - 1);
        }
        if (jsonToParse && jsonToParse !== "[]") {
          try { 
            const treatmentsFromFile = JSON.parse(jsonToParse);
            if(Array.isArray(treatmentsFromFile)) {
              parsedTreatments = treatmentsFromFile;
            }
          } 
          catch(e: any) { console.error(`Error parsing treatmentsJSON for Admission ${aData.AdmissionID}, Patient ${aData.PatientID}: ${e.message}. Processed: '${jsonToParse}'. Raw: '${treatmentsJsonString}'`); }
        }
      }
      const admission: Admission = {
        id: aData.AdmissionID, patientId: aData.PatientID,
        scheduledStart: aData.ScheduledStartDateTime, scheduledEnd: aData.ScheduledEndDateTime,
        actualStart: aData.ActualStartDateTime || undefined, actualEnd: aData.ActualEndDateTime || undefined,
        reason: aData.ReasonForVisit, 
        transcript: aData.transcript || undefined,
        soapNote: aData.soapNote || undefined,
        treatments: parsedTreatments.length > 0 ? parsedTreatments : undefined,
        priorAuthJustification: aData.priorAuthJustification || undefined
      };
      if (!this.admissions[admission.patientId]) { this.admissions[admission.patientId] = []; }
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
