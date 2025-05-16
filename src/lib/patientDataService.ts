import { Patient, Admission, Diagnosis, LabResult, Treatment, ComplexCaseAlert } from './types';
import { supabaseDataService } from './supabaseDataService';

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

  /** Simple change notification */
  private changeSubscribers: Array<() => void> = [];

  subscribe(cb: () => void) {
    if (!this.changeSubscribers.includes(cb)) {
      this.changeSubscribers.push(cb);
    }
  }

  private emitChange() {
    this.changeSubscribers.forEach(fn => {
      try { fn(); } catch (_) {}
    });
  }

  /**
   * Load patient data from the provided data files
   */
  async loadPatientData(): Promise<void> {
    if (this.isLoaded) {
      this.debugMessages.push("PRINT_DEBUG SERVICE (LPD): loadPatientData CALLED - Data already loaded. Skipping.");
      return;
    }
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
    
    // Define files together with fallback names (first entry has highest priority)
    const filesToFetch = [
      {
        names: ['Enriched_Patients.tsv', 'PatientCorePopulatedTable.txt'],
        arraySetter: (arr: any[]) => (patientsArray = arr),
        critical: true,
        label: 'patients',
      },
      {
        names: ['Enriched_Admissions.tsv', 'AdmissionsCorePopulatedTable.txt'],
        arraySetter: (arr: any[]) => (admissionsArray = arr),
        critical: true,
        label: 'admissions',
      },
      {
        names: ['AdmissionsDiagnosesCorePopulatedTable.txt'],
        arraySetter: (arr: any[]) => (diagnosesArray = arr),
        critical: false,
        label: 'diagnoses',
      },
      {
        names: ['LabsCorePopulatedTable.txt'],
        arraySetter: (arr: any[]) => (labResultsArray = arr),
        critical: false,
        label: 'labResults',
      },
    ];

    // Attempt to fetch each logical file, trying each of its candidate filenames in order until one succeeds
    for (const fileEntry of filesToFetch) {
      let successfullyParsed: any[] | null = null;
      let lastError: string | null = null;

      for (const candidateName of fileEntry.names) {
        const filePath = `/data/100-patients/${candidateName}`;
        try {
          this.debugMessages.push(
            `PRINT_DEBUG SERVICE (fetchRawData): Attempting to fetch ${filePath}...`,
          );
          const response = await fetch(filePath);
          this.debugMessages.push(
            `PRINT_DEBUG SERVICE (fetchRawData): ${candidateName} - Response OK: ${response.ok}, Status: ${response.status}`,
          );

          if (response.ok) {
            const fileText = await response.text();
            this.debugMessages.push(
              `PRINT_DEBUG SERVICE (fetchRawData): ${candidateName} - Text (first 300 chars): ${fileText.substring(
                0,
                300,
              )}`,
            );
            // Parse and store
            successfullyParsed = parseTSV(fileText, candidateName, this.debugMessages);
            this.debugMessages.push(
              `PRINT_DEBUG SERVICE (fetchRawData): ${candidateName} - Parsed Count: ${successfullyParsed.length}`,
            );
            // Break the loop once a candidate has succeeded
            break;
          } else {
            lastError = `Status ${response.statusText}`;
          }
        } catch (e: any) {
          lastError = e.message;
          this.debugMessages.push(
            `PRINT_DEBUG SERVICE (fetchRawData): EXCEPTION fetching/parsing ${candidateName}: ${e.message}`,
          );
        }
      }

      if (successfullyParsed) {
        fileEntry.arraySetter(successfullyParsed);
      } else {
        const msg = `All attempts failed for logical file (${fileEntry.names.join(
          ', ',
        )}). Last error: ${lastError}`;
        this.debugMessages.push(`PRINT_DEBUG SERVICE (fetchRawData): ${msg}`);
        if (fileEntry.critical) {
          throw new Error(msg);
        }
      }
    }

    this.debugMessages.push('PRINT_DEBUG SERVICE (fetchRawData): Finished all fetch attempts.');
    return {
      patients: patientsArray,
      admissions: admissionsArray,
      diagnoses: diagnosesArray,
      labResults: labResultsArray,
    };
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

        // Replace "" (escaped quotes from TSV's own quoting mechanism) with " (a single quote for standard JSON)
        // This is done *after* stripping the outermost TSV quotes, if any.
        // For example, if original TSV cell was "[{\\"\\"key\\": \\"\\"value\\"\\"}]" (a string)
        // jsonToParse becomes "[{\\"key\\": \\"value\\"}]" (still a string, but with outer quotes removed)
        // This replacement makes it "[{\\"key\\": \\"value\\"}]" (valid JSON string content)
        jsonToParse = jsonToParse.replace(/""/g, '"');
        if (currentPID === targetAlertPatientID) this.debugMessages.push(`PRINT_DEBUG SERVICE (PRD Alerts): alertsJSON after replacing double-double-quotes for ${targetAlertPatientID}: '${jsonToParse}'`);

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
      // Map core and enriched admission fields into unified structure
      const scheduledStart =
        aData.ScheduledStartDateTime ||
        aData.ConsultationScheduledDate ||
        aData.ConsultationActualStart ||
        '';
      const scheduledEnd =
        aData.ScheduledEndDateTime || aData.ConsultationActualEnd || '';
      const actualStart =
        aData.ActualStartDateTime || aData.ConsultationActualStart || undefined;
      const actualEnd =
        aData.ActualEndDateTime || aData.ConsultationActualEnd || undefined;

      const admission: Admission = {
        id: aData.AdmissionID,
        patientId: aData.PatientID,
        scheduledStart,
        scheduledEnd,
        actualStart,
        actualEnd,
        reason: aData.ReasonForVisit || undefined,
        transcript: aData.transcript || undefined,
        soapNote: aData.soapNote || undefined,
        treatments: parsedTreatments.length > 0 ? parsedTreatments : undefined,
        priorAuthJustification: aData.priorAuthJustification || undefined,
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
        labResults: this.allLabResultsByAdmission[key] || [],
      };
    });
    // After constructing, patch transcripts from localStorage if present (client only)
    if (typeof window !== 'undefined') {
      admissionDetails.forEach((detail) => {
        const ad = detail.admission;
        const stored = localStorage.getItem(`transcript-${patient.id}-${ad.id}`);
        if (stored && !ad.transcript) {
          ad.transcript = stored;
        }
      });
    }
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
        if ((visit as any).isDeleted) return;
        if (visit.scheduledStart && new Date(visit.scheduledStart) > now) {
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
        if ((ad as any).isDeleted) return;
        list.push({ patient, admission: ad });
      });
    });
    return list;
  }

  /**
   * Update the transcript for a given patient admission (in-memory only for now)
   */
  updateAdmissionTranscript(patientId: string, admissionId: string, transcript: string) {
    const admissionList = this.admissions[patientId];
    if (!admissionList) return;
    const admission = admissionList.find((a) => a.id === admissionId);
    if (admission) {
      admission.transcript = transcript;
    }
    // Also persist in localStorage so it survives reloads (client side only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`transcript-${patientId}-${admissionId}`, transcript);
      } catch (_) {}
    }
  }

  /**
   * Create a new admission (consultation) for a patient and return it so the UI can select it.
   * This is an in-memory helper – in a real app you would persist to a backend.
   */
  createNewAdmission(patientId: string, opts?: { reason?: string; scheduledStart?: string; scheduledEnd?: string }): Admission {
    const newId = `new-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newAdmission: Admission = {
      id: newId,
      patientId,
      scheduledStart: opts?.scheduledStart ?? nowIso,
      scheduledEnd: opts?.scheduledEnd ?? '',
      actualStart: undefined,
      actualEnd: undefined,
      reason: opts?.reason ?? undefined,
      transcript: undefined,
      soapNote: undefined,
    } as Admission;

    if (!this.admissions[patientId]) {
      this.admissions[patientId] = [];
    }
    this.admissions[patientId].unshift(newAdmission); // place newest first
    this.emitChange();
    return newAdmission;
  }

  /** Create new patient in-memory (non-Supabase fallback) */
  createNewPatient(input: { firstName: string; lastName: string; gender?: string; dateOfBirth?: string }): Patient {
    const newId = `p-${Date.now()}`;
    const patient: Patient = {
      id: newId,
      firstName: input.firstName,
      lastName: input.lastName,
      name: `${input.firstName} ${input.lastName}`.trim(),
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
    };
    this.patients[newId] = patient;
    this.admissions[newId] = [];
    this.emitChange();
    return patient;
  }

  createNewPatientWithAdmission(
    patientInput: { firstName: string; lastName: string; gender?: string; dateOfBirth?: string },
    admissionInput?: { reason?: string; scheduledStart?: string; scheduledEnd?: string }
  ): { patient: Patient; admission: Admission } {
    const patient = this.createNewPatient(patientInput);
    const admission = this.createNewAdmission(patient.id);
    if (admissionInput?.reason) admission.reason = admissionInput.reason;
    if (admissionInput?.scheduledStart) admission.scheduledStart = admissionInput.scheduledStart;
    if (admissionInput?.scheduledEnd) admission.scheduledEnd = admissionInput.scheduledEnd;
    this.emitChange(); // ensure change is emitted after this combined operation
    return { patient, admission };
  }

  markAdmissionAsDeleted(patientId: string, admissionId: string): boolean {
    const patientAdmissions = this.admissions[patientId];
    if (!patientAdmissions) return false;

    const admissionIndex = patientAdmissions.findIndex(ad => ad.id === admissionId);
    if (admissionIndex === -1) return false;

    patientAdmissions[admissionIndex].isDeleted = true;
    patientAdmissions[admissionIndex].deletedAt = new Date().toISOString();
    this.emitChange();
    return true;
  }

  restoreAdmission(patientId: string, admissionId: string): boolean {
    const patientAdmissions = this.admissions[patientId];
    if (!patientAdmissions) return false;

    const admissionIndex = patientAdmissions.findIndex(ad => ad.id === admissionId && ad.isDeleted);
    if (admissionIndex === -1) return false;

    patientAdmissions[admissionIndex].isDeleted = false;
    patientAdmissions[admissionIndex].deletedAt = undefined;
    this.emitChange();
    return true;
  }

  permanentlyDeleteAdmission(patientId: string, admissionId: string): boolean {
    const patientAdmissions = this.admissions[patientId];
    if (!patientAdmissions) return false;

    const initialLength = patientAdmissions.length;
    this.admissions[patientId] = patientAdmissions.filter(ad => ad.id !== admissionId || !ad.isDeleted);
    
    if (this.admissions[patientId].length < initialLength) {
      this.emitChange();
      return true;
    }
    return false;
  }

  unsubscribe(cb: () => void) {
    this.changeSubscribers = this.changeSubscribers.filter(sub => sub !== cb);
    // console.log("PatientDataService (Prod Debug): Unsubscribed a callback. Total subscribers:", this.changeSubscribers.length);
  }

  // Methods like searchPatients, hasAutoimmuneDiagnosis, hasOncologyDiagnosis would continue
  // to work on the unified this.patients and this.admissions data.
  // ... (other methods from original file can be re-added if needed, e.g., lab results, specific diagnoses)
}

// Decide which implementation to expose based on compile-time env flag
const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

export const patientDataService = useSupabase ? supabaseDataService : new PatientDataService();
