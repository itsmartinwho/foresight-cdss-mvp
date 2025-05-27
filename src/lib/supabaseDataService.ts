import { getSupabaseClient } from './supabaseClient';
import {
  Patient, Encounter, Diagnosis, LabResult, ComplexCaseAlert, Treatment,
  PatientDataPayload, DifferentialDiagnosisRecord, DifferentialDiagnosis // Import the new types
} from './types';

/*
  A minimal drop-in replacement for PatientDataService when NEXT_PUBLIC_USE_SUPABASE=true.
  Only the methods currently used by the UI have been implemented.
  Any additional methods simply return empty data structures for now.
*/
class SupabaseDataService {
  private supabase = getSupabaseClient();
  private isLoaded = false;
  private isLoading = false; // This will be managed by loadPromise
  private loadPromise: Promise<void> | null = null;
  private singlePatientLoadPromises: Map<string, Promise<void>> = new Map(); // Added for single patient loads
  private patients: Record<string, Patient> = {}; // key = original PatientID (e.g., "1", "FB2ABB...")
  private encounters: Record<string, Encounter> = {}; // key = composite `${patientId}_${originalEncounterID}`
  private encountersByPatient: Record<string, string[]> = {}; // key = original PatientID, value = array of composite encounter keys
  private diagnoses: Record<string, Diagnosis[]> = {}; // key = patient ID, value = array of diagnoses
  private labResults: Record<string, LabResult[]> = {}; // key = patient ID, value = array of lab results
  private differentialDiagnoses: Record<string, DifferentialDiagnosisRecord[]> = {}; // key = patient ID, value = array of differential diagnoses
  private patientUuidToOriginalId: Record<string, string> = {}; // key = Supabase UUID, value = original patient ID
  /** Simple pub-sub so UI layers can refresh after data-mutating calls */
  private changeSubscribers: Array<() => void> = [];

  // Method to load data for a single patient
  private async loadSinglePatientData(patientId: string): Promise<void> {
    if (this.patients[patientId]) { // Already loaded
      return Promise.resolve();
    }
    if (this.singlePatientLoadPromises.has(patientId)) { // Load already in progress
      return this.singlePatientLoadPromises.get(patientId);
    }

    console.log(`SupabaseDataService: Loading data for patient ${patientId}`);
    const promise = (async () => {
      try {
        // Fetch patient details
        const { data: patientRow, error: pErr } = await this.supabase
          .from('patients')
          .select('*')
          .eq('patient_id', patientId)
          .single();

        if (pErr) {
          console.error(`SupabaseDataService (Prod Debug): Error fetching patient ${patientId}:`, pErr);
          throw pErr;
        }
        if (!patientRow) {
          throw new Error(`Patient ${patientId} not found.`);
        }

        // Process patient data (similar to loadPatientData but for one patient)
        const patient: Patient = {
          id: patientRow.patient_id,
          name: patientRow.name,
          firstName: patientRow.first_name,
          lastName: patientRow.last_name,
          gender: patientRow.gender,
          dateOfBirth: patientRow.birth_date ? new Date(patientRow.birth_date).toISOString().split('T')[0] : undefined,
          photo: patientRow.photo_url,
          race: patientRow.race,
          ethnicity: patientRow.ethnicity,
          maritalStatus: patientRow.marital_status,
          language: patientRow.language,
          povertyPercentage: patientRow.poverty_percentage !== null ? Number(patientRow.poverty_percentage) : undefined,
          alerts: (() => { // Simplified alerts parsing for brevity, ensure it matches full load
            const src = patientRow.alerts || patientRow.alerts_json || (patientRow as any).alertsJSON || patientRow.extra_data?.alerts || patientRow.extra_data?.alertsJSON;
            if (!src) return [];
            try {
              if (Array.isArray(src)) return src as ComplexCaseAlert[];
              if (typeof src === 'string') {
                let s = src.trim();
                if ((s.startsWith('\"') && s.endsWith('\"')) || (s.startsWith("'") && s.endsWith("'"))) {
                  s = s.substring(1, s.length - 1);
                }
                s = s.replace(/""/g, '"');
                const parsed = JSON.parse(s);
                return Array.isArray(parsed) ? parsed as ComplexCaseAlert[] : [];
              }
            } catch (e) { console.warn('SupabaseDataService: Unable to parse alerts for patient', patientRow.patient_id, e); }
            return [];
          })(),

          nextAppointment: patientRow.next_appointment_date ? new Date(patientRow.next_appointment_date).toISOString() : undefined,
          reason: patientRow.patient_level_reason,
        };
        this.patients[patient.id] = patient;
        if (!this.encountersByPatient[patient.id]) {
          this.encountersByPatient[patient.id] = [];
        }
        // Store the mapping from Supabase UUID to original patient ID
        this.patientUuidToOriginalId[patientRow.id] = patient.id;

        // Fetch encounters for this patient
        // Important: Ensure 'encounters' table has a way to filter by patient_id
        // Assuming 'encounters' table has 'patient_id_fk' or similar that matches 'patients.patient_id'
        // This query might need adjustment based on your actual schema for encounters
        const { data: encounterRows, error: vErr } = await this.supabase
          .from('encounters')
          .select('*')
          .eq('extra_data->>PatientID', patientId); // Querying based on the existing pattern in loadPatientData

        if (vErr) {
          console.error(`SupabaseDataService (Prod Debug): Error fetching encounters for patient ${patientId}:`, vErr);
          throw vErr;
        }

        if (encounterRows) {
          encounterRows.forEach((row) => {
            const encounterSupabaseUUID = row.id;
            const encounterBusinessKey = row.encounter_id; // Assumes DB column is now encounter_id
            const patientSupabaseUUIDFromEncounter = row.patient_supabase_id;

            if (!encounterBusinessKey) {
              console.warn(`SupabaseDataService: Skipping encounter ${encounterSupabaseUUID} - missing encounter_id`);
              return;
            }

            if (!patientSupabaseUUIDFromEncounter) {
              console.warn(`SupabaseDataService: Skipping encounter ${encounterBusinessKey} - missing patient_supabase_id`);
              return;
            }
            
            const patientPublicId = this.patientUuidToOriginalId[patientSupabaseUUIDFromEncounter];

            if (!patientPublicId) {
              console.warn(`SupabaseDataService: Skipping encounter ${encounterBusinessKey} - patient ${patientSupabaseUUIDFromEncounter} not found`);
              return;
            }
            
            const compositeKey = `${patientPublicId}_${encounterBusinessKey}`;
            
            const encounter: Encounter = {
              id: encounterSupabaseUUID, 
              encounterIdentifier: encounterBusinessKey, 
              patientId: patientPublicId, 
              scheduledStart: row.scheduled_start_datetime ? new Date(row.scheduled_start_datetime).toISOString() : '',
              scheduledEnd: row.scheduled_end_datetime ? new Date(row.scheduled_end_datetime).toISOString() : '',
              actualStart: row.actual_start_datetime ? new Date(row.actual_start_datetime).toISOString() : undefined,
              actualEnd: row.actual_end_datetime ? new Date(row.actual_end_datetime).toISOString() : undefined,
              reasonCode: row.reason_code,
              reasonDisplayText: row.reason_display_text,
              transcript: row.transcript,
              soapNote: row.soap_note,
              treatments: row.treatments || undefined,
              priorAuthJustification: row.prior_auth_justification,
              isDeleted: !!row.is_deleted,
            };
            this.encounters[compositeKey] = encounter;
            if (!this.encountersByPatient[patientPublicId]) {
              this.encountersByPatient[patientPublicId] = [];
            }
            if (!this.encountersByPatient[patientPublicId].includes(compositeKey)) {
              this.encountersByPatient[patientPublicId].push(compositeKey);
            }
          });
        }

        // Fetch diagnoses for this patient
        const { data: dxRows } = await this.supabase.from('conditions')
          .select('*')
          .eq('patient_id', patientRow.id);

        // Fetch lab results for this patient
        const { data: labRows } = await this.supabase.from('lab_results')
          .select('*')
          .eq('patient_id', patientRow.id);

        // Store diagnoses
        if (dxRows) {
          this.diagnoses[patientId] = dxRows.map(dx => ({
            patientId: patientId,
            encounterId: dx.encounter_id || '',
            code: dx.code,
            description: dx.description,
          }));
  
        }
        
        // Store lab results
        if (labRows) {
          this.labResults[patientId] = labRows.map(lab => ({
            patientId: patientId,
            encounterId: lab.encounter_id || '',
            name: lab.name,
            value: lab.value,
            units: lab.units,
            dateTime: lab.date_time ? new Date(lab.date_time).toISOString() : undefined,
            referenceRange: lab.reference_range,
            flag: lab.flag,
          }));

        }

        this.emitChange(); // Notify subscribers
      } catch (error) {
        console.error(`SupabaseDataService (Prod Debug): Exception during single patient data fetch for ${patientId}:`, error);
        throw error; // Re-throw
      } finally {
        this.singlePatientLoadPromises.delete(patientId); // Clear promise once done (success or fail)
      }
    })();
    this.singlePatientLoadPromises.set(patientId, promise);
    return promise;
  }

  async loadPatientData(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }
    if (this.loadPromise) {
      console.log("SupabaseDataService (Prod Debug): Load already in progress, returning existing promise.");
      return this.loadPromise;
    }

    console.log("SupabaseDataService: Loading patient data...");
    this.loadPromise = (async () => {
      // this.isLoading = true; // loadPromise presence indicates loading

      this.patients = {}; // Clear previous state
      this.encounters = {};
      this.encountersByPatient = {};

      let patientRows = null;
      try {
        console.log('SupabaseDataService: Fetching patients...');
        const { data, error: pErr } = await this.supabase.from('patients').select('*');
        if (pErr) {
          console.error('SupabaseDataService (Prod Debug): Error fetching patients:', pErr);
          throw pErr;
        }
        patientRows = data;
      } catch (error) {
        console.error('SupabaseDataService (Prod Debug): Exception during patient fetch:', error);
        this.loadPromise = null; // Reset promise on error
        // this.isLoading = false;
        throw error; // Re-throw to be caught by caller if necessary
      }
      
      if (!patientRows) {
          console.error('SupabaseDataService (Prod Debug): patientRows is null after fetch. Cannot proceed.');
          this.loadPromise = null;
          // this.isLoading = false;
          throw new Error("Patient rows fetch returned null.");
      }

      patientRows.forEach((row) => {
        // Gather possible alert sources
        const candidateSources = [
          { key: 'alerts', value: row.alerts },
          { key: 'alerts_json', value: row.alerts_json },
          { key: 'alertsJSON', value: (row as any).alertsJSON },
          { key: 'extra_data.alerts', value: row.extra_data?.alerts },
          { key: 'extra_data.alertsJSON', value: row.extra_data?.alertsJSON },
        ];
        // Pick first candidate that appears to have meaningful data (non-empty array or non-empty string)
        let chosenRawAlerts: any = undefined;
        let chosenKey = '';
        for (const c of candidateSources) {
          if (c.value === undefined || c.value === null) continue;
          if (Array.isArray(c.value) && c.value.length === 0) continue; // skip empty array
          if (typeof c.value === 'string' && c.value.trim().length === 0) continue; // skip empty string
          chosenRawAlerts = c.value;
          chosenKey = c.key;
          break;
        }
        const rawAlertsData = chosenRawAlerts;
        const patient: Patient = {
          id: row.patient_id,
          name: row.name,
          firstName: row.first_name,
          lastName: row.last_name,
          gender: row.gender,
          dateOfBirth: row.birth_date ? new Date(row.birth_date).toISOString().split('T')[0] : undefined,
          photo: row.photo_url,
          race: row.race,
          ethnicity: row.ethnicity,
          maritalStatus: row.marital_status,
          language: row.language,
          povertyPercentage: row.poverty_percentage !== null ? Number(row.poverty_percentage) : undefined,
          alerts: (() => {
            const srcCandidates = [row.alerts, row.alerts_json, (row as any).alertsJSON, row.extra_data?.alerts, row.extra_data?.alertsJSON];
            let src: any = undefined;
            for (const val of srcCandidates) {
              if (val === undefined || val === null) continue;
              if (Array.isArray(val) && val.length === 0) continue;
              if (typeof val === 'string' && val.trim().length === 0) continue;
              src = val;
              break;
            }
            if (!src) return [];
            try {
              if (Array.isArray(src)) return src as ComplexCaseAlert[];
              if (typeof src === 'string') {
                let s = src.trim();
                if ((s.startsWith('\"') && s.endsWith('\"')) || (s.startsWith("'") && s.endsWith("'"))) {
                  s = s.substring(1, s.length - 1);
                }
                s = s.replace(/""/g, '"');
                const parsed = JSON.parse(s);
                return Array.isArray(parsed) ? parsed as ComplexCaseAlert[] : [];
              }
            } catch (e) {
              console.warn('SupabaseDataService: Unable to parse alerts for patient', row.patient_id, e);
            }
            return [];
          })(),

          nextAppointment: row.next_appointment_date ? new Date(row.next_appointment_date).toISOString() : undefined,
          reason: row.patient_level_reason,
        };
        this.patients[patient.id] = patient;
        this.encountersByPatient[patient.id] = []; 
        // Store the mapping from Supabase UUID to original patient ID
        this.patientUuidToOriginalId[row.id] = patient.id;
      });

      let encounterRows = null;
      let totalEncountersAvailable = 0;
      try {
          console.log('SupabaseDataService: Fetching encounters...');
          const { data, error: vErr, count } = await this.supabase
              .from('encounters')
              .select('*', { count: 'exact' }); 

          if (vErr) {
              console.error('SupabaseDataService (Prod Debug): Error fetching encounters:', vErr);
              throw vErr;
          }
          encounterRows = data;
          totalEncountersAvailable = count ?? 0;
      } catch (error) {
          console.error('SupabaseDataService (Prod Debug): Exception during encounters fetch:', error);
          this.loadPromise = null; 
          // this.isLoading = false;
          throw error;
      }

      if (!encounterRows) {
          console.error('SupabaseDataService (Prod Debug): encounterRows is null after fetch. Cannot proceed with encounters.');
          this.loadPromise = null;
          // this.isLoading = false;
          throw new Error("Encounter rows fetch returned null.");
      }

      let encountersProcessed = 0;
      encounterRows.forEach((row) => {
        const encounterSupabaseUUID = row.id; 
        const encounterBusinessKey = row.encounter_id; // Assumes DB column is now encounter_id
        const patientSupabaseUUIDFromEncounter = row.patient_supabase_id;

        if (!encounterBusinessKey) {
          console.warn(`SupabaseDataService: Skipping encounter ${encounterSupabaseUUID} - missing encounter_id`);
          return;
        }

        if (!patientSupabaseUUIDFromEncounter) {
          console.warn(`SupabaseDataService: Skipping encounter ${encounterBusinessKey} - missing patient_supabase_id`);
          return;
        }

        const patientPublicId = this.patientUuidToOriginalId[patientSupabaseUUIDFromEncounter];

        if (!patientPublicId) {
          console.warn(`SupabaseDataService: Skipping encounter ${encounterBusinessKey} - patient ${patientSupabaseUUIDFromEncounter} not found`);
          return;
        }
        
        const compositeKey = `${patientPublicId}_${encounterBusinessKey}`;

        const encounter: Encounter = {
          id: encounterSupabaseUUID, 
          encounterIdentifier: encounterBusinessKey, 
          patientId: patientPublicId, 
          scheduledStart: row.scheduled_start_datetime ? new Date(row.scheduled_start_datetime).toISOString() : '',
          scheduledEnd: row.scheduled_end_datetime ? new Date(row.scheduled_end_datetime).toISOString() : '',
          actualStart: row.actual_start_datetime ? new Date(row.actual_start_datetime).toISOString() : undefined,
          actualEnd: row.actual_end_datetime ? new Date(row.actual_end_datetime).toISOString() : undefined,
          reasonCode: row.reason_code,
          reasonDisplayText: row.reason_display_text,
          transcript: row.transcript,
          soapNote: row.soap_note,
          treatments: row.treatments || undefined, 
          priorAuthJustification: row.prior_auth_justification,
          isDeleted: !!row.is_deleted, 
        };
        this.encounters[compositeKey] = encounter;
        if (!this.encountersByPatient[patientPublicId]) {
          this.encountersByPatient[patientPublicId] = [];
        }
        if (!this.encountersByPatient[patientPublicId].includes(compositeKey)) {
          this.encountersByPatient[patientPublicId].push(compositeKey);
        }
        encountersProcessed++;
      });

      this.isLoaded = true;
      // this.isLoading = false;
      this.loadPromise = null;

      // Fetch diagnoses for all patients
      console.log('SupabaseDataService: Fetching diagnoses...');
      const { data: allDiagnoses, error: dxErr } = await this.supabase
        .from('conditions')
        .select('*');
      
      if (dxErr) {
        console.error('SupabaseDataService: Error fetching diagnoses:', dxErr);
      } else if (allDiagnoses) {
        // Group diagnoses by patient
        allDiagnoses.forEach((dx) => {
          // Find the original patient ID from the UUID
          const originalPatientId = this.patientUuidToOriginalId[dx.patient_id];
          
          if (originalPatientId) {
            if (!this.diagnoses[originalPatientId]) {
              this.diagnoses[originalPatientId] = [];
            }
            
            const diagnosis: Diagnosis = {
              patientId: originalPatientId,
              encounterId: dx.encounter_id || '', // This is now a UUID that references encounters.id
              code: dx.code,
              description: dx.description,
            };
            
            this.diagnoses[originalPatientId].push(diagnosis);
          }
        });
        console.log(`SupabaseDataService: Loaded ${allDiagnoses.length} diagnoses`);
      }

      // Fetch lab results for all patients
      console.log('SupabaseDataService: Fetching lab results...');
      const { data: allLabResults, error: labErr } = await this.supabase
        .from('lab_results')
        .select('*');
      
      if (labErr) {
        console.error('SupabaseDataService: Error fetching lab results:', labErr);
      } else if (allLabResults) {
        // Group lab results by patient
        allLabResults.forEach((lab) => {
          // Find the original patient ID from the UUID
          const originalPatientId = this.patientUuidToOriginalId[lab.patient_id];
          
          if (originalPatientId) {
            if (!this.labResults[originalPatientId]) {
              this.labResults[originalPatientId] = [];
            }
            
            const labResult: LabResult = {
              patientId: originalPatientId,
              encounterId: lab.encounter_id || '', // This is now a UUID that references encounters.id
              name: lab.name,
              value: lab.value,
              units: lab.units,
              dateTime: lab.date_time ? new Date(lab.date_time).toISOString() : undefined,
              referenceRange: lab.reference_range,
              flag: lab.flag,
            };
            
            this.labResults[originalPatientId].push(labResult);
          }
        });
        console.log(`SupabaseDataService: Loaded ${allLabResults.length} lab results`);
      }

      // Fetch differential diagnoses for all patients
      console.log('SupabaseDataService: Fetching differential diagnoses...');
      const { data: allDifferentialDiagnoses, error: diffErr } = await this.supabase
        .from('differential_diagnoses')
        .select('*');
      
      if (diffErr) {
        console.error('SupabaseDataService: Error fetching differential diagnoses:', diffErr);
      } else if (allDifferentialDiagnoses) {
        // Group differential diagnoses by patient
        allDifferentialDiagnoses.forEach((diff) => {
          // Find the original patient ID from the UUID
          const originalPatientId = this.patientUuidToOriginalId[diff.patient_id];
          
          if (originalPatientId) {
            if (!this.differentialDiagnoses[originalPatientId]) {
              this.differentialDiagnoses[originalPatientId] = [];
            }
            
            this.differentialDiagnoses[originalPatientId].push(diff);
          }
        });
        console.log(`SupabaseDataService: Loaded ${allDifferentialDiagnoses.length} differential diagnoses`);
      }

      this.emitChange();
    })();
    return this.loadPromise;
  }

  getAllPatients(): Patient[] {
    if (!this.isLoaded && !this.isLoading) {
        // Kick off a background load; return empty array for now.
        this.loadPatientData().catch(() => {/* error already logged inside */});
        return [];
    }
    return Object.values(this.patients);
  }

  getPatient(patientId: string): Patient | null {
    // No need to trigger load here, getPatientData will handle it.
    // This method becomes a simple cache accessor.
    return this.patients[patientId] ?? null;
  }

  getPatientEncounters(patientId: string): Encounter[] {
    // If patient data isn't loaded at all, this might return empty
    // but getPatientData should ensure data is loaded before this is relied upon heavily.
    const encounterKeys = this.encountersByPatient[patientId] || [];
    return encounterKeys.map(key => this.encounters[key]).filter(Boolean) as Encounter[];
  }

  async getPatientData(patientId: string): Promise<PatientDataPayload | null> {
    // console.log(`SupabaseDataService (Prod Debug): getPatientData called for ${patientId}. isLoaded:`, this.isLoaded, 'isLoading:', this.isLoading);
    
    // If the specific patient is not in cache, try to load them.
    if (!this.patients[patientId] && !this.singlePatientLoadPromises.has(patientId)) {
      console.log(`SupabaseDataService (Prod Debug): Patient ${patientId} not in cache. Attempting single load.`);
      try {
        await this.loadSinglePatientData(patientId);
      } catch (error) {
        console.error(`SupabaseDataService (Prod Debug): Failed to load single patient ${patientId} in getPatientData:`, error);
        return null; // Failed to load, return null
      }
    } else if (this.singlePatientLoadPromises.has(patientId)) {
      // If a load is in progress for this patient, await it
      console.log(`SupabaseDataService (Prod Debug): Patient ${patientId} load in progress. Awaiting...`);
      try {
        await this.singlePatientLoadPromises.get(patientId);
      } catch (error) {
         console.error(`SupabaseDataService (Prod Debug): Existing load for single patient ${patientId} failed:`, error);
        return null;
      }
    }

    // After attempting to load, check cache again
    const patient = this.patients[patientId];
    if (!patient) {
        console.warn(`SupabaseDataService (Prod Debug): getPatientData - Patient ${patientId} not found in cache (after load attempt).`);
        return null;
    }

    const patientEncounters = this.getPatientEncounters(patientId);
    const encounterDetails = patientEncounters.map(encounter => ({
      encounter: encounter,
      diagnoses: this.getDiagnosesForEncounter(patientId, encounter.id),
      labResults: this.getLabResultsForEncounter(patientId, encounter.id),
    }));
    return { patient, encounters: encounterDetails };
  }

  getUpcomingConsultations(): { patient: Patient; encounter: Encounter }[] {
    if (!this.isLoaded && !this.isLoading) {
        console.error("SupabaseDataService: getUpcomingConsultations called when data not loaded and not currently loading. THIS IS A BUG.");
    }
    const upcoming: { patient: Patient; encounter: Encounter }[] = [];
    const now = new Date();
    const nowTime = now.getTime();

    Object.values(this.encounters).forEach(enc => {
      if ((enc as any).isDeleted) return;
      if (enc.scheduledStart && typeof enc.scheduledStart === 'string' && enc.scheduledStart.length > 0) {
        try {
          const startDate = new Date(enc.scheduledStart);
          const startTime = startDate.getTime();
          if (startDate instanceof Date && !isNaN(startTime)) { 
            const isInFuture = startTime > nowTime;
            if (isInFuture) {
              const patient = this.patients[enc.patientId];
              if (patient) {
                upcoming.push({ patient, encounter: enc });
              } else {
                 console.warn(`SupabaseDataService (Prod Debug): Found upcoming encounter ${enc.id} but patient ${enc.patientId} not found in cache.`);
              }
            }
          } else {
             console.warn(`SupabaseDataService (Prod Debug): Invalid date object after parsing scheduledStart for encounter ${enc.id}. Original string: ${enc.scheduledStart}`);
          }
        } catch (e) {
            console.warn(`SupabaseDataService (Prod Debug): Error processing date for encounter ${enc.id}. Original string: ${enc.scheduledStart}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    });
    return upcoming.sort((a, b) => new Date(a.encounter.scheduledStart).getTime() - new Date(b.encounter.scheduledStart).getTime());
  }

  getPastConsultations(): { patient: Patient; encounter: Encounter }[] {
    if (!this.isLoaded && !this.isLoading) {
      console.error("SupabaseDataService: getPastConsultations called when data not loaded and not currently loading. THIS IS A BUG.");
    }
    const past: { patient: Patient; encounter: Encounter }[] = [];
    const now = new Date();
    const nowTime = now.getTime();

    Object.values(this.encounters).forEach(enc => {
      if ((enc as any).isDeleted) return;
      if (enc.scheduledStart && typeof enc.scheduledStart === 'string' && enc.scheduledStart.length > 0) {
        try {
          const startDate = new Date(enc.scheduledStart);
          const startTime = startDate.getTime();
          if (startDate instanceof Date && !isNaN(startTime)) {
            const isInPast = startTime <= nowTime;
            if (isInPast) {
              const patient = this.patients[enc.patientId];
              if (patient) {
                past.push({ patient, encounter: enc });
              }
            }
          }
        } catch (e) {
          // Ignore parse errors for past
        }
      }
    });
    return past.sort((a, b) => new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime());
  }

  async updateEncounterTranscript(patientId: string, encounterCompositeId: string, transcript: string): Promise<void> {
    const originalEncounterId = encounterCompositeId.split('_').slice(-1)[0];
    const { error } = await this.supabase
      .from('encounters')
      .update({ transcript: transcript })
      .eq('encounter_id', originalEncounterId);
    if (error) {
      console.error('SupabaseDataService (Prod Debug): Error updating transcript in DB:', error.message);
      throw error;
    }
    if (this.encounters[encounterCompositeId]) {
      this.encounters[encounterCompositeId].transcript = transcript;
    } else {
      console.warn(`SupabaseDataService (Prod Debug): updateEncounterTranscript - Encounter with composite ID ${encounterCompositeId} not found in local cache to update.`);
    }
  }

  async updateEncounterObservations(
    patientId: string, // Though not directly used in the SQL, good for context/caching if needed
    encounterCompositeId: string, 
    observations: string[]
  ): Promise<void> {
    const originalEncounterId = encounterCompositeId.split('_').pop(); // Get the actual encounter_id for the DB
    if (!originalEncounterId) {
      console.error('SupabaseDataService: Could not extract originalEncounterId from composite ID:', encounterCompositeId);
      throw new Error('Invalid encounterCompositeId');
    }

    const { error } = await this.supabase
      .from('encounters')
      .update({ observations: observations })
      .eq('encounter_id', originalEncounterId);

    if (error) {
      console.error('SupabaseDataService (Prod Debug): Error updating observations in DB:', error.message);
      throw error;
    }

    // Update local cache
    if (this.encounters[encounterCompositeId]) {
      this.encounters[encounterCompositeId].observations = observations;
      this.emitChange(); // Notify subscribers of the change
    } else {
      console.warn(`SupabaseDataService (Prod Debug): updateEncounterObservations - Encounter with composite ID ${encounterCompositeId} not found in local cache to update.`);
    }
    console.log("Observations updated successfully in DB and cache for encounter:", encounterCompositeId);
  }

  async updateEncounterSOAPNote(patientId: string, encounterCompositeId: string, soapNote: string): Promise<void> {
    const originalEncounterId = encounterCompositeId.split('_').pop();
    if (!originalEncounterId) {
      console.error('SupabaseDataService: Could not extract originalEncounterId from composite ID:', encounterCompositeId);
      throw new Error('Invalid encounterCompositeId');
    }

    const { error } = await this.supabase
      .from('encounters')
      .update({ soap_note: soapNote })
      .eq('encounter_id', originalEncounterId);

    if (error) {
      console.error('SupabaseDataService: Error updating SOAP note in DB:', error.message);
      throw error;
    }

    // Update local cache
    if (this.encounters[encounterCompositeId]) {
      this.encounters[encounterCompositeId].soapNote = soapNote;
      this.emitChange();
    } else {
      console.warn(`SupabaseDataService: updateEncounterSOAPNote - Encounter with composite ID ${encounterCompositeId} not found in local cache to update.`);
    }
    console.log("SOAP note updated successfully in DB and cache for encounter:", encounterCompositeId);
  }

  async createNewEncounter(
    patientId: string,
    opts?: { reason?: string; scheduledStart?: string; scheduledEnd?: string; duration?: number }
  ): Promise<Encounter> {
    // Ensure patient exists (reload on demand)
    if (!this.patients[patientId]) {
      if (!this.isLoaded && !this.isLoading) {
        await this.loadPatientData();
      }
      if (!this.patients[patientId]) {
        throw new Error(`Patient with original ID ${patientId} not found in cache; cannot create encounter.`);
      }
    }

    // Find the Supabase UUID for this patient
    const patientSupabaseUuid = Object.keys(this.patientUuidToOriginalId).find(
      uuid => this.patientUuidToOriginalId[uuid] === patientId
    );

    if (!patientSupabaseUuid) {
      throw new Error(`Patient Supabase UUID not found for patient ID ${patientId}; cannot create encounter.`);
    }

    const newEncounterId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Compute start and end times based on optional duration
    const startIso = opts?.scheduledStart ?? nowIso;
    const endIso = opts?.duration
      ? new Date(new Date(startIso).getTime() + opts.duration * 60000).toISOString()
      : opts?.scheduledEnd ?? null;

    // Insert into DB
    const { error: insertErr } = await this.supabase.from('encounters').insert([
      {
        encounter_id: newEncounterId,
        patient_supabase_id: patientSupabaseUuid, // Fix: Add the required foreign key
        reason_code: opts?.reason ?? null,
        reason_display_text: opts?.reason ?? null, // Set the display text as well
        scheduled_start_datetime: startIso,
        scheduled_end_datetime: endIso,
        actual_start_datetime: null,
        actual_end_datetime: null,
        is_deleted: false,
        extra_data: { PatientID: patientId },
      },
    ]);

    if (insertErr) {
      console.error('SupabaseDataService: Failed to insert new encounter into DB', insertErr);
      throw insertErr;
    }

    // Get the actual Supabase UUID for the encounter we just created
    const { data: createdEncounter, error: fetchErr } = await this.supabase
      .from('encounters')
      .select('id')
      .eq('encounter_id', newEncounterId)
      .single();

    if (fetchErr || !createdEncounter) {
      console.error('SupabaseDataService: Failed to fetch created encounter UUID', fetchErr);
      throw new Error('Failed to retrieve created encounter UUID');
    }

    const encounterSupabaseUuid = createdEncounter.id;

    // Build local cache record
    const compositeId = `${patientId}_${newEncounterId}`;
    const encounter: Encounter = {
      id: encounterSupabaseUuid, // Use the actual Supabase UUID
      encounterIdentifier: newEncounterId,
      patientId,
      scheduledStart: startIso,
      scheduledEnd: endIso ?? '',
      reasonCode: undefined, // Will be AI generated
      reasonDisplayText: opts?.reason ?? undefined, // This now takes the verbose reason
    } as Encounter;

    this.encounters[compositeId] = encounter;
    if (!this.encountersByPatient[patientId]) this.encountersByPatient[patientId] = [];
    this.encountersByPatient[patientId].unshift(compositeId);
    this.emitChange();
    return encounter;
  }

  // ------------------------------------------------------------------
  // Utility pub-sub helpers & simple CRUD fallbacks
  // ------------------------------------------------------------------
  subscribe(cb: () => void) {
    if (!this.changeSubscribers.includes(cb)) {
      this.changeSubscribers.push(cb);
    }
  }

  private emitChange() {
    this.changeSubscribers.forEach((fn) => {
      try {
        fn();
      } catch {
        /* no-op */
      }
    });
  }

  async createNewPatient(input: { firstName: string; lastName: string; gender?: string; dateOfBirth?: string }): Promise<Patient> {
    const newId = crypto.randomUUID();

    const { error: insertErr } = await this.supabase.from('patients').insert([
      {
        patient_id: newId,
        first_name: input.firstName,
        last_name: input.lastName,
        gender: input.gender ?? null,
        birth_date: input.dateOfBirth ?? null,
        name: `${input.firstName} ${input.lastName}`.trim(),
      },
    ]);

    if (insertErr) {
      console.error('SupabaseDataService: Failed to insert new patient', insertErr);
      throw insertErr;
    }

    const patient: Patient = {
      id: newId,
      firstName: input.firstName,
      lastName: input.lastName,
      name: `${input.firstName} ${input.lastName}`.trim(),
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      alerts: [],
          } as Patient;
      this.patients[newId] = patient;
      this.encountersByPatient[newId] = [];
      this.emitChange();
      return patient;
  }

  async createNewPatientWithEncounter(
    patientInput: { firstName: string; lastName: string; gender?: string; dateOfBirth?: string },
    encounterInput?: { reason?: string; scheduledStart?: string; scheduledEnd?: string; duration?: number }
  ): Promise<{ patient: Patient; encounter: Encounter }> {
    const patient = await this.createNewPatient(patientInput);
    const encounter = await this.createNewEncounter(patient.id, encounterInput);
    return { patient, encounter };
  }

  // ------------------------------------------------------------------
  // Soft delete helpers (in-memory updates; DB persistence TBD)
  // ------------------------------------------------------------------
  /**
   * Mark an encounter as deleted (soft delete).
   * Returns true if encounter exists and was marked deleted.
   */
  markEncounterAsDeleted(patientId: string, encounterId: string): boolean {
    const enc = this.encounters[encounterId];
    if (!enc || enc.patientId !== patientId) return false;
    if (enc.isDeleted) return true; // already deleted

    // Update in-memory cache first for immediate UI feedback
    (enc as Encounter).isDeleted = true;

    // Persist to DB in background (try both candidate PK column names)
    const originalEncounterId = encounterId.split('_').slice(-1)[0];
    this.supabase.from('encounters')
      .update({ is_deleted: true })
      .eq('encounter_id', originalEncounterId)
      .then(async ({ error, data }) => {
        if (error) {
          console.error('SupabaseDataService: update by encounter_id failed', JSON.stringify(error, null, 2));
          // Attempt alternative column
          const { error: err2 } = await this.supabase.from('encounters')
            .update({ is_deleted: true })
            .eq('id', originalEncounterId);
          if (err2) {
            console.error('SupabaseDataService: update by id failed', JSON.stringify(err2, null,2));
          }
        }
      });

    this.emitChange();
    return true;
  }

  /** Restore a previously soft-deleted encounter */
  restoreEncounter(patientId: string, encounterId: string): boolean {
    const enc = this.encounters[encounterId];
    if (!enc || enc.patientId !== patientId) return false;
    if (!enc.isDeleted) return true; // already active

    delete (enc as any).isDeleted;

    // Persist to DB in background (try both candidate PK column names)
    const originalEncounterId = encounterId.split('_').slice(-1)[0];
    this.supabase.from('encounters')
      .update({ is_deleted: false })
      .eq('encounter_id', originalEncounterId)
      .then(async ({ error }) => {
        if (error) {
          console.error('SupabaseDataService: restore update encounter_id failed', JSON.stringify(error, null,2));
          const { error: err2 } = await this.supabase.from('encounters')
            .update({ is_deleted: false })
            .eq('id', originalEncounterId);
          if (err2) {
            console.error('SupabaseDataService: restore update id failed', JSON.stringify(err2, null,2));
          }
        }
      });

    this.emitChange();
    return true;
  }

  /** Permanently remove an encounter from cache (DB removal TBD) */
  permanentlyDeleteEncounter(patientId: string, encounterId: string): boolean {
    const enc = this.encounters[encounterId];
    if (!enc || enc.patientId !== patientId) return false;

    // Remove from in-memory maps first for immediate UI update
    delete this.encounters[encounterId];
    if (this.encountersByPatient[patientId]) {
      this.encountersByPatient[patientId] = this.encountersByPatient[patientId].filter(key => key !== encounterId);
    }

    // Delete from DB in background (try both candidate PK column names)
    const originalEncounterId = encounterId.split('_').slice(-1)[0];
    this.supabase.from('encounters')
      .delete()
      .eq('encounter_id', originalEncounterId)
      .then(async ({ error }) => {
        if (error) {
          console.error('SupabaseDataService: delete encounter_id failed', JSON.stringify(error, null,2));
          const { error: err2 } = await this.supabase.from('encounters')
            .delete()
            .eq('id', originalEncounterId);
          if (err2) {
            console.error('SupabaseDataService: delete id failed', JSON.stringify(err2, null,2));
          }
        }
      });

    this.emitChange();
    return true;
  }

  unsubscribe(cb: () => void) {
    this.changeSubscribers = this.changeSubscribers.filter(s => s !== cb);
    // console.log("SupabaseDataService (Prod Debug): Unsubscribed a callback. Total subscribers:", this.changeSubscribers.length);
  }

  getPatientDiagnoses(patientId: string): Diagnosis[] {
    return this.diagnoses[patientId] || [];
  }

  getPatientLabResults(patientId: string): LabResult[] {
    return this.labResults[patientId] || [];
  }

  getDiagnosesForEncounter(patientId: string, encounterId: string): Diagnosis[] {
    const patientDiagnoses = this.diagnoses[patientId] || [];
    
    // Filter by Supabase UUID (encounter_id in database is a UUID foreign key)
    const filtered = patientDiagnoses.filter(dx => dx.encounterId === encounterId);
    return filtered;
  }

  getLabResultsForEncounter(patientId: string, encounterId: string): LabResult[] {
    const patientLabs = this.labResults[patientId] || [];
    
    // Filter by Supabase UUID (encounter_id in database is a UUID foreign key)
    const filtered = patientLabs.filter(lab => lab.encounterId === encounterId);
    return filtered;
  }

  // Differential Diagnoses methods
  getPatientDifferentialDiagnoses(patientId: string): DifferentialDiagnosisRecord[] {
    return this.differentialDiagnoses[patientId] || [];
  }

  getDifferentialDiagnosesForEncounter(patientId: string, encounterId: string): DifferentialDiagnosisRecord[] {
    const allDiffs = this.differentialDiagnoses[patientId] || [];
    return allDiffs.filter(diff => diff.encounter_id === encounterId);
  }

  async saveDifferentialDiagnoses(
    patientId: string, 
    encounterId: string, 
    differentials: DifferentialDiagnosis[]
  ): Promise<void> {
    try {
      // Get patient UUID
      const patient = this.patients[patientId];
      if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
      }

      const patientUuid = Object.keys(this.patientUuidToOriginalId).find(
        uuid => this.patientUuidToOriginalId[uuid] === patientId
      );

      if (!patientUuid) {
        throw new Error(`Patient UUID not found for ${patientId}`);
      }

      // Get encounter UUID
      const encounter = this.encounters[`${patientId}_${encounterId}`];
      if (!encounter) {
        throw new Error(`Encounter ${encounterId} not found for patient ${patientId}`);
      }

      // Delete existing differential diagnoses for this encounter
      await this.supabase
        .from('differential_diagnoses')
        .delete()
        .eq('patient_id', patientUuid)
        .eq('encounter_id', encounter.id);

      // Insert new differential diagnoses
      if (differentials.length > 0) {
        const records = differentials.map((diff, index) => ({
          patient_id: patientUuid,
          encounter_id: encounter.id,
          diagnosis_name: diff.name,
          likelihood: diff.likelihood,
          key_factors: diff.keyFactors,
          rank_order: index + 1
        }));

        const { error } = await this.supabase
          .from('differential_diagnoses')
          .insert(records);

        if (error) {
          throw error;
        }

        // Update local cache
        const newRecords: DifferentialDiagnosisRecord[] = records.map(record => ({
          id: '', // Will be filled by database
          patient_id: record.patient_id,
          encounter_id: record.encounter_id,
          diagnosis_name: record.diagnosis_name,
          likelihood: record.likelihood,
          key_factors: record.key_factors,
          rank_order: record.rank_order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        if (!this.differentialDiagnoses[patientId]) {
          this.differentialDiagnoses[patientId] = [];
        }

        // Remove old records for this encounter and add new ones
        this.differentialDiagnoses[patientId] = this.differentialDiagnoses[patientId]
          .filter(diff => diff.encounter_id !== encounter.id)
          .concat(newRecords);
      }

      this.emitChange();
    } catch (error) {
      console.error('Error saving differential diagnoses:', error);
      throw error;
    }
  }
}

// Export as singleton consistent with legacy implementation
export const supabaseDataService = new SupabaseDataService();