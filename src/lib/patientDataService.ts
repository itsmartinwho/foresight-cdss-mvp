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
  // debugMessagesRef.push(`PRINT_DEBUG SERVICE (parseTSV for ${forFile}): Parsed Header: ${JSON.stringify(header)}`);
  
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
      let rawVal = paddedValues[index] ?? "";
      // Decode standard CSV/TSV quoting where the entire field is wrapped in double quotes
      // and internal quotes are doubled. Example: ""{""key"": ""value""}"" -> {"key": "value"}
      if (typeof rawVal === "string" && rawVal.length >= 2 && rawVal.startsWith('"') && rawVal.endsWith('"')) {
        rawVal = rawVal.slice(1, -1).replace(/""/g, '"');
      }
      obj[colName] = (rawVal as string).trim();
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
    this.debugMessages.push("PRINT_DEBUG SERVICE (LPD): loadPatientData CALLED - Unified Data Model.");
    try {
      const rawData = await this.fetchRawData();
      this.debugMessages.push(`PRINT_DEBUG SERVICE (LPD): fetchRawData returned - Patients: ${rawData.patients?.length || 0}, Admissions: ${rawData.admissions?.length || 0}, Diagnoses: ${rawData.diagnoses?.length || 0}, Labs: ${rawData.labResults?.length || 0}`);
      if (!rawData.patients || rawData.patients.length === 0) {
        this.debugMessages.push("PRINT_DEBUG SERVICE (LPD): No patients from Enriched_Patients.tsv. Aborting.");
        this.isLoaded = true; 
        return;
      }
      this.processRawData(rawData);
      this.isLoaded = true; 
      this.debugMessages.push(`PRINT_DEBUG SERVICE (LPD): Successfully loaded. Total patients in map: ${Object.keys(this.patients).length}`);
    } catch (error: any) {
      this.debugMessages.push(`PRINT_DEBUG SERVICE (LPD): Error in loadPatientData: ${error.message}`);
      console.error('Error in loadPatientData within PatientDataService:', error);
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
    this.debugMessages.push("PRINT_DEBUG SERVICE (fetchRawData): Starting fetch for all TSV/TXT files.");
    let patientsArray: any[] = [], admissionsArray: any[] = [], diagnosesArray: any[] = [], labResultsArray: any[] = [];
    
    const filesToFetch = [
      { name: 'Enriched_Patients.tsv', arraySetter: (arr: any[]) => patientsArray = arr, critical: true },
      { name: 'Enriched_Admissions.tsv', arraySetter: (arr: any[]) => admissionsArray = arr, critical: true },
      { name: 'AdmissionsDiagnosesCorePopulatedTable.txt', arraySetter: (arr: any[]) => diagnosesArray = arr, critical: false },
      { name: 'LabsCorePopulatedTable.txt', arraySetter: (arr: any[]) => labResultsArray = arr, critical: false }
    ];

    for (const file of filesToFetch) {
      const filePath = `/data/100-patients/${file.name}`;
      try {
        this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): Attempting to fetch ${filePath}...`);
        const response = await fetch(filePath);
        this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): ${file.name} - Response OK: ${response.ok}, Status: ${response.status}`);
        if (response.ok) {
          const fileText = await response.text();
          this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): ${file.name} - Text (first 300 chars): ${fileText.substring(0, 300)}`);
          // Pass this.debugMessages to parseTSV so it can also log its header parsing attempt
          const parsedData = parseTSV(fileText, file.name, this.debugMessages); 
          file.arraySetter(parsedData);
          this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): ${file.name} - Parsed Count: ${parsedData.length}`);
        } else {
          this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): FAILED to fetch ${file.name}. Status: ${response.statusText}`);
          if (file.critical) throw new Error(`Critical file ${file.name} failed to load.`);
        }
      } catch (e: any) { 
        this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): EXCEPTION fetching/parsing ${file.name}: ${e.message}`);
        console.error(`Exception Fetch/Parse ${file.name}:`, e);
        if (file.critical) throw e; // Re-throw if a critical file fails
      }
    }
    this.debugMessages.push("PRINT_DEBUG SERVICE (fetchRawData): Finished all fetch attempts.");
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

    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Starting. Patients from fetch: ${data.patients?.length || 0}, Admissions: ${data.admissions?.length || 0}`);
    const targetAlertPatientID = 'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F';
    const demoPatientIDs = ['1', '2', '3'];

    data.patients.forEach((pData: any) => {
      if (!pData.PatientID) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Skipped row, no PatientID`); return; }
      const currentPID = pData.PatientID.trim();

      if (demoPatientIDs.includes(currentPID) || currentPID === targetAlertPatientID) {
        this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Processing PatientID ${currentPID}. Raw pData: ${JSON.stringify(pData)}`);
      }
      
      let parsedAlerts: ComplexCaseAlert[] = [];
      const alertsJsonField = pData['alertsJSON'];
      if (alertsJsonField && typeof alertsJsonField === 'string') {
        let S = alertsJsonField.trim();
        if (currentPID === targetAlertPatientID) this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Alerts): Target ${targetAlertPatientID} - Raw alertsJSON from TSV: '${S}'`);
        
        // Most direct attempt assuming the string from TSV is the JSON itself, potentially with one layer of TSV quoting (already handled by parseTSV if simple)
        // Or the value itself is a string that needs un-quoting like """[...]""" or "'[...]'"
        let jsonToParse = S;
        if (jsonToParse.length >= 2 && jsonToParse.startsWith('"') && jsonToParse.endsWith('"')) {
             // Handles cases like ""[...]"" (double quote around valid JSON string)
            jsonToParse = jsonToParse.substring(1, jsonToParse.length - 1);
        }
        // Handle cases like '"[...]"' (single quote around double-quoted JSON string)
        if (jsonToParse.length >= 2 && jsonToParse.startsWith("'") && jsonToParse.endsWith("'")) {
            jsonToParse = jsonToParse.substring(1, jsonToParse.length - 1);
        }
        // After these, jsonToParse *should* be just [{...}] if it was correctly quoted/escaped by python

        if (currentPID === targetAlertPatientID) this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Alerts): alertsJSON after any manual unwrap for ${targetAlertPatientID}: '${jsonToParse}'`);

        if (jsonToParse && (jsonToParse.startsWith("[") || jsonToParse.startsWith("{")) && (jsonToParse.endsWith("]") || jsonToParse.endsWith("}"))) {
          try {
            const alertsFromFile = JSON.parse(jsonToParse);
            if (currentPID === targetAlertPatientID) this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Alerts): Successfully parsed for ${currentPID}: ${JSON.stringify(alertsFromFile)}`);
            if (Array.isArray(alertsFromFile)) { parsedAlerts = alertsFromFile.filter(al => al && typeof al.id === 'string' && typeof al.msg === 'string');}
          } catch (e: any) {
            this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Alerts): ERROR parsing final JSON for ${currentPID}: ${e.message}. String was: '${jsonToParse}'`);
            parsedAlerts = []; 
          }
        } else if (jsonToParse && jsonToParse !== "[]" && currentPID === targetAlertPatientID) { 
            this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Alerts): Post-unwrap for ${currentPID} not valid JSON structure: '${jsonToParse}'`);
            parsedAlerts = [];
        }
      }
      const patient: Patient = {
        id: currentPID, name: pData.name, firstName: pData.firstName, lastName: pData.lastName,
        gender: pData.PatientGender, dateOfBirth: pData.PatientDateOfBirth, race: pData.PatientRace,
        maritalStatus: pData.PatientMaritalStatus, language: pData.PatientLanguage, 
        povertyPercentage: parseFloat(pData.PatientPopulationPercentageBelowPoverty) || 0,
        alerts: parsedAlerts.length > 0 ? parsedAlerts : undefined,
        photo: pData.photo || undefined
      };
      this.patients[patient.id] = patient;
      if (currentPID === targetAlertPatientID) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Alerts): Final patient.alerts for ${targetAlertPatientID}: ${JSON.stringify(this.patients[targetAlertPatientID]?.alerts)}`);}
    });
    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Patients processed. Count: ${Object.keys(this.patients).length}`);
    demoPatientIDs.forEach(id => {
        const p = this.patients[id];
        if (p) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD - Post Patient Loop): Patient ${id} - Name: ${p.name}, Photo: ${p.photo}`); }
        else { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD - Post Patient Loop): Patient ${id} NOT FOUND.`); }
    });

    data.admissions.forEach((aData: any) => {
      if (!aData.PatientID || !aData.AdmissionID) return;
      let parsedTreatments: Treatment[] = [];
      const treatmentsJsonField = aData.treatmentsJSON;
      if (treatmentsJsonField && typeof treatmentsJsonField === 'string') {
        let S = treatmentsJsonField.trim();
        let previousLength = -1;
        while (S.length !== previousLength) {
            previousLength = S.length;
            if (S.length >= 2) {
                if (S.startsWith("'") && S.endsWith("'")) { S = S.substring(1, S.length - 1); }
                else if (S.startsWith('"') && S.endsWith('"')) { S = S.substring(1, S.length - 1); }
            }
            S = S.trim();
        }
        let cleanedJsonString = S.replace(/[^\x20-\x7E\u00A0-\uFFFF\{\}\[\]\,\:\"\w\d\s\.\-\\/]/g, "");
        if (cleanedJsonString && (cleanedJsonString.startsWith("[") || cleanedJsonString.startsWith("{")) && (cleanedJsonString.endsWith("]") || cleanedJsonString.endsWith("}"))) {
          try { const T = JSON.parse(cleanedJsonString); if(Array.isArray(T)) { parsedTreatments = T; } } 
          catch(e:any) { this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Treatments): Error parsing final JSON for AdID ${aData.AdmissionID}, PtID ${aData.PatientID}: ${e.message}. String: '${cleanedJsonString}'`); parsedTreatments = []; }
        } else if (cleanedJsonString) {
            this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Treatments): Post-aggressive-clean for AdID ${aData.AdmissionID} not valid JSON: '${cleanedJsonString}'`);
            parsedTreatments = [];
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
    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Admissions processed. Total distinct patient IDs in admissions: ${Object.keys(this.admissions).length}`);

    // Diagnoses processing loop
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
    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Finished Diagnoses Processing. this.allDiagnosesByAdmission key count: ${Object.keys(this.allDiagnosesByAdmission).length}`);

    // Labs processing loop
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
    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): Finished Labs Processing. this.allLabResultsByAdmission key count: ${Object.keys(this.allLabResultsByAdmission).length}`);
    
    this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD): processRawData finished. Final patient count: ${Object.keys(this.patients).length}`);

    // Inject synthetic upcoming admissions for demo patients if none exist in the future
    this.ensureDemoUpcomingAdmissions();
  }

  /**
   * Ensure demo patients (IDs 1-3) always have at least one upcoming consultation so the dashboard
   * and patients list showcase the UX appropriately even when historical demo data is dated.
   */
  private ensureDemoUpcomingAdmissions() {
    const demoPatientIDs = ["1", "2", "3"];
    const now = new Date();
    const defaultReason = "Routine follow-up";

    demoPatientIDs.forEach((pid, idx) => {
      const patient = this.patients[pid];
      if (!patient) return; // Skip if demo patient was not present in TSV

      const existing = (this.admissions[pid] || []).some((ad) => {
        return ad.scheduledStart && new Date(ad.scheduledStart) > now;
      });
      if (existing) return; // Already has a future visit

      // Create a synthetic visit 24h + idx*1h ahead so they don't collide.
      const start = new Date(now.getTime() + 24 * 60 * 60 * 1000 + idx * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const synthetic: Admission = {
        id: `UPCOMING_DEMO_${pid}_${start.getTime()}`,
        patientId: pid,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        actualStart: undefined,
        actualEnd: undefined,
        reason: defaultReason,
        transcript: undefined,
        soapNote: undefined,
        treatments: undefined,
        priorAuthJustification: undefined,
      } as Admission;

      if (!this.admissions[pid]) this.admissions[pid] = [];
      this.admissions[pid].push(synthetic);
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
    this.debugMessages.push("PRINT_DEBUG SERVICE (getUpcoming): Called");
    Object.values(this.patients).forEach(patient => {
      const patientAdmissions = this.admissions[patient.id] || [];
      patientAdmissions.forEach((visit) => {
        if (visit.scheduledStart && new Date(visit.scheduledStart) > now) {
          if (['1','2','3'].includes(patient.id)) {
            this.debugMessages.push(`PRINT_DEBUG SERVICE (getUpcoming): Found upcoming for demo patient ${patient.id}: Visit ${visit.id}, Date ${visit.scheduledStart}, Patient Name: ${patient.name}, Photo: ${patient.photo}`);
          }
          upcoming.push({ patient, visit });
        }
      });
    });
    upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
    this.debugMessages.push(`PRINT_DEBUG SERVICE (getUpcoming): Returning ${upcoming.length} upcoming appointments.`);
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
