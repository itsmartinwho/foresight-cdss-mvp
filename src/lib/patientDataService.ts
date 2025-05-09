import { Patient, Admission, Diagnosis, LabResult, Treatment, ComplexCaseAlert } from './types';

// Helper function to parse TSV data (can be made more robust)
function parseTSV(tsvText: string): any[] {
  if (!tsvText || !tsvText.trim()) return [];
  const lines = tsvText.trim().split('\n');
  if (lines.length < 2) return []; // Header + at least one data row

  const raw_header = lines[0].split('\t');
  const header = raw_header.map(h => h.trim().replace(/\uFEFF/g, ''));
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
    this.debugMessages.push("PRINT_DEBUG SERVICE (LPD): loadPatientData called.");
    try {
      const rawData = await this.fetchRawData();
      this.debugMessages.push(`PRINT_DEBUG SERVICE (LPD): fetchRawData returned - Patients: ${rawData.patients?.length || 0}, Admissions: ${rawData.admissions?.length || 0}, Diagnoses: ${rawData.diagnoses?.length || 0}, Labs: ${rawData.labResults?.length || 0}`);
      if ((rawData.patients?.length || 0) === 0) {
        this.debugMessages.push("PRINT_DEBUG SERVICE (LPD): No patients fetched. Aborting processRawData.");
        this.isLoaded = true; // Mark as loaded to prevent loops, but data is empty.
        return;
      }
      this.processRawData(rawData);
      this.isLoaded = true; 
      this.debugMessages.push(`PRINT_DEBUG SERVICE (LPD): Successfully loaded. Total patients in map: ${Object.keys(this.patients).length}`);
    } catch (error: any) {
      this.debugMessages.push(`PRINT_DEBUG SERVICE (LPD): Error in loadPatientData: ${error.message}`);
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

    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Starting. Received patients: ${data.patients?.length || 0}`);
    const targetPatientId1 = 'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F';

    data.patients.forEach((pData: any) => {
      if (!pData.PatientID) {
        this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Row ${pData.index} in Enriched_Patients.tsv missing PatientID.`);
        return; 
      }
      if (pData.PatientID === targetPatientId1) {
        this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Processing target patient ${pData.PatientID}. Available keys: ${Object.keys(pData).join(', ')}`);
        this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Raw alertsJSON for ${pData.PatientID}: '${pData.alertsJSON}'`);
      }
      
      let parsedAlerts: ComplexCaseAlert[] = [];
      if (pData['alertsJSON'] && typeof pData['alertsJSON'] === 'string') {
        let jsonAlertStringToParse = pData['alertsJSON'].trim();
        if ((jsonAlertStringToParse.startsWith("'") && jsonAlertStringToParse.endsWith("'")) || (jsonAlertStringToParse.startsWith("\"") && jsonAlertStringToParse.endsWith("\""))) {
            jsonAlertStringToParse = jsonAlertStringToParse.substring(1, jsonAlertStringToParse.length - 1);
        }
        if (jsonAlertStringToParse !== "" && jsonAlertStringToParse !== "[]") {
          try {
            const alertsFromFile = JSON.parse(jsonAlertStringToParse);
            if (pData.PatientID === targetPatientId1) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Parsed alerts for ${pData.PatientID}: ${JSON.stringify(alertsFromFile)}`); }
            if (Array.isArray(alertsFromFile)) { parsedAlerts = alertsFromFile.filter(al => al && al.id && al.msg); }
          } catch (e: any) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Error parsing alertsJSON for ${pData.PatientID}: ${e.message}. Raw: '${pData['alertsJSON']}'`); }
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
        photo: pData.photo || undefined // Photo now comes from Enriched_Patients.tsv
      };
      this.patients[patient.id] = patient;
      if (pData.PatientID === targetPatientId1) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Final patient.alerts for ${targetPatientId1}: ${JSON.stringify(this.patients[targetPatientId1]?.alerts)}`); }
    });
    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Patient map size after file load: ${Object.keys(this.patients).length}`);

    data.admissions.forEach((aData: any) => {
      if (!aData.PatientID || !aData.AdmissionID) return;
      let parsedTreatments: Treatment[] = [];
      if (aData.treatmentsJSON && typeof aData.treatmentsJSON === 'string' && aData.treatmentsJSON.trim() !== "[]" && aData.treatmentsJSON.trim() !== ""){
        try { parsedTreatments = JSON.parse(aData.treatmentsJSON); } 
        catch(e) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Error parsing treatmentsJSON for Admission ${aData.AdmissionID}, Patient ${aData.PatientID}: ${e}`); }
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
    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Admissions processed. Total distinct patient IDs in admissions: ${Object.keys(this.admissions).length}`);

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

    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): processRawData finished. Final patient count: ${Object.keys(this.patients).length}`);
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
