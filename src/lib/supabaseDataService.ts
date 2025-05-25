import { getSupabaseClient } from './supabaseClient';
import {
  Patient, Encounter, Diagnosis, LabResult, ComplexCaseAlert, Treatment,
  PatientDataPayload // Import the new type
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

    console.log(`SupabaseDataService (Prod Debug): Initiating new data load for single patient ${patientId}.`);
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
          primaryDiagnosis: patientRow.primary_diagnosis_description,
          diagnosis: patientRow.general_diagnosis_details,
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
            const compositeKey = `${patientId}_${row.encounter_id}`;
            const encounter: Encounter = {
              id: row.id, // Actual UUID of the encounter
              encounterIdentifier: row.encounter_id, // Human-readable/external ID
              patientId: patientId,
              scheduledStart: row.scheduled_start_datetime ? new Date(row.scheduled_start_datetime).toISOString() : '',
              scheduledEnd: row.scheduled_end_datetime ? new Date(row.scheduled_end_datetime).toISOString() : '',
              actualStart: row.actual_start_datetime ? new Date(row.actual_start_datetime).toISOString() : undefined,
              actualEnd: row.actual_end_datetime ? new Date(row.actual_end_datetime).toISOString() : undefined,
              reasonCode: row.reason_code,
              transcript: row.transcript,
              soapNote: row.soap_note,
              treatments: row.treatments || undefined,
              priorAuthJustification: row.prior_auth_justification,
              isDeleted: !!row.is_deleted,
            };
            this.encounters[compositeKey] = encounter;
            if (!this.encountersByPatient[patientId].includes(compositeKey)) {
               this.encountersByPatient[patientId].push(compositeKey);
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
            admissionId: dx.encounter_id || '',
            code: dx.code,
            description: dx.description,
          }));
          console.log(`Fetched ${dxRows.length} diagnoses for patient ${patientId}`);
        }
        
        // Store lab results
        if (labRows) {
          this.labResults[patientId] = labRows.map(lab => ({
            patientId: patientId,
            admissionId: lab.encounter_id || '',
            name: lab.name,
            value: lab.value,
            units: lab.units,
            dateTime: lab.date_time ? new Date(lab.date_time).toISOString() : undefined,
            referenceRange: lab.reference_range,
            flag: lab.flag,
          }));
          console.log(`Fetched ${labRows.length} lab results for patient ${patientId}`);
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

    console.log("SupabaseDataService (Prod Debug): Initiating new data load sequence.");
    this.loadPromise = (async () => {
      // this.isLoading = true; // loadPromise presence indicates loading

      this.patients = {}; // Clear previous state
      this.encounters = {};
      this.encountersByPatient = {};

      let patientRows = null;
      try {
        console.log('SupabaseDataService (Prod Debug): Fetching patients from Supabase...');
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
          primaryDiagnosis: row.primary_diagnosis_description,
          diagnosis: row.general_diagnosis_details,
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
          console.log('SupabaseDataService (Prod Debug): Attempting to fetch ALL encounters with count...');
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
        const originalPatientIDFromEncounterExtraData = row.extra_data?.PatientID;
        
        if (!originalPatientIDFromEncounterExtraData) {
          console.warn(`SupabaseDataService (Prod Debug): Skipping encounter ${row.encounter_id} due to missing PatientID in extra_data.`);
          return;
        }
        if (!this.patients[originalPatientIDFromEncounterExtraData]) {
          console.warn(`SupabaseDataService (Prod Debug): Skipping encounter ${row.encounter_id}. Patient by original ID '${originalPatientIDFromEncounterExtraData}' not found.`);
          return;
        }

        const patientPublicId = originalPatientIDFromEncounterExtraData;
        const compositeKey = `${patientPublicId}_${row.encounter_id}`;

        const encounter: Encounter = {
          id: row.id, // Actual UUID of the encounter
          encounterIdentifier: row.encounter_id, // Human-readable/external ID
          patientId: patientPublicId, 
          scheduledStart: row.scheduled_start_datetime ? new Date(row.scheduled_start_datetime).toISOString() : '',
          scheduledEnd: row.scheduled_end_datetime ? new Date(row.scheduled_end_datetime).toISOString() : '',
          actualStart: row.actual_start_datetime ? new Date(row.actual_start_datetime).toISOString() : undefined,
          actualEnd: row.actual_end_datetime ? new Date(row.actual_end_datetime).toISOString() : undefined,
          reasonCode: row.reason_code,
          transcript: row.transcript,
          soapNote: row.soap_note,
          treatments: row.treatments || undefined, 
          priorAuthJustification: row.prior_auth_justification,
          isDeleted: !!row.is_deleted, // Ensure this mapping is correct
        };
        this.encounters[compositeKey] = encounter;
        if (this.encountersByPatient[patientPublicId]) {
          this.encountersByPatient[patientPublicId].push(compositeKey);
        } else {
          this.encountersByPatient[patientPublicId] = [compositeKey];
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
              admissionId: dx.encounter_id || '',
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
              admissionId: lab.encounter_id || '',
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
      admission: encounter, // Keep 'admission' key for backward compatibility
      diagnoses: this.getDiagnosesForEncounter(patientId, encounter.id),
      labResults: this.getLabResultsForEncounter(patientId, encounter.id),
    }));
    return { patient, admissions: encounterDetails }; // Keep 'admissions' key for backward compatibility
  }

  getAllAdmissions(): { patient: Patient | null; admission: Encounter }[] {
    // console.log('SupabaseDataService (Prod Debug): getAllAdmissions called. isLoaded:', this.isLoaded, 'isLoading:', this.isLoading, 'Count:', Object.keys(this.encounters).length);
    if (!this.isLoaded && !this.isLoading) {
        console.error("SupabaseDataService: getAllAdmissions called when data not loaded and not currently loading. THIS IS A BUG.");
    }
    const allAds: { patient: Patient | null; admission: Encounter }[] = [];
    Object.values(this.encounters).forEach(encounter => {
      if ((encounter as any).isDeleted) return; // skip deleted
      const patient = this.patients[encounter.patientId] ?? null;
      allAds.push({ patient, admission: encounter });
    });
    return allAds;
  }

  getUpcomingConsultations(): { patient: Patient; visit: Encounter }[] {
    if (!this.isLoaded && !this.isLoading) {
        console.error("SupabaseDataService: getUpcomingConsultations called when data not loaded and not currently loading. THIS IS A BUG.");
    }
    const upcoming: { patient: Patient; visit: Encounter }[] = [];
    const now = new Date();
    const nowTime = now.getTime();

    Object.values(this.encounters).forEach(ad => {
      if ((ad as any).isDeleted) return;
      if (ad.scheduledStart && typeof ad.scheduledStart === 'string' && ad.scheduledStart.length > 0) {
        try {
          const startDate = new Date(ad.scheduledStart);
          const startTime = startDate.getTime();
          if (startDate instanceof Date && !isNaN(startTime)) { 
            const isInFuture = startTime > nowTime;
            if (isInFuture) {
              const patient = this.patients[ad.patientId];
              if (patient) {
                upcoming.push({ patient, visit: ad });
              } else {
                 console.warn(`SupabaseDataService (Prod Debug): Found upcoming visit ${ad.id} but patient ${ad.patientId} not found in cache.`);
              }
            }
          } else {
             console.warn(`SupabaseDataService (Prod Debug): Invalid date object after parsing scheduledStart for admission ${ad.id}. Original string: ${ad.scheduledStart}`);
          }
        } catch (e) {
            console.warn(`SupabaseDataService (Prod Debug): Error processing date for admission ${ad.id}. Original string: ${ad.scheduledStart}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    });
    return upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
  }

  getPastConsultations(): { patient: Patient; visit: Encounter }[] {
    if (!this.isLoaded && !this.isLoading) {
      console.error("SupabaseDataService: getPastConsultations called when data not loaded and not currently loading. THIS IS A BUG.");
    }
    const past: { patient: Patient; visit: Encounter }[] = [];
    const now = new Date();
    const nowTime = now.getTime();

    Object.values(this.encounters).forEach(ad => {
      if ((ad as any).isDeleted) return;
      if (ad.scheduledStart && typeof ad.scheduledStart === 'string' && ad.scheduledStart.length > 0) {
        try {
          const startDate = new Date(ad.scheduledStart);
          const startTime = startDate.getTime();
          if (startDate instanceof Date && !isNaN(startTime)) {
            const isInPast = startTime <= nowTime;
            if (isInPast) {
              const patient = this.patients[ad.patientId];
              if (patient) {
                past.push({ patient, visit: ad });
              }
            }
          }
        } catch (e) {
          // Ignore parse errors for past
        }
      }
    });
    return past.sort((a, b) => new Date(b.visit.scheduledStart).getTime() - new Date(a.visit.scheduledStart).getTime());
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

  // Backward compatibility alias
  async updateAdmissionTranscript(patientId: string, admissionCompositeId: string, transcript: string): Promise<void> {
    return this.updateEncounterTranscript(patientId, admissionCompositeId, transcript);
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

  // Backward compatibility alias
  async updateAdmissionObservations(
    patientId: string,
    admissionCompositeId: string,
    observations: string[]
  ): Promise<void> {
    return this.updateEncounterObservations(patientId, admissionCompositeId, observations);
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

  // Backward compatibility alias
  async updateAdmissionSOAPNote(patientId: string, admissionCompositeId: string, soapNote: string): Promise<void> {
    return this.updateEncounterSOAPNote(patientId, admissionCompositeId, soapNote);
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
        throw new Error(`Patient with original ID ${patientId} not found in cache; cannot create admission.`);
      }
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
        reason_code: opts?.reason ?? null,
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

    // Build local cache record
    const compositeId = `${patientId}_${newEncounterId}`;
    const encounter: Encounter = {
      id: compositeId,
      encounterIdentifier: newEncounterId,
      patientId,
      scheduledStart: startIso,
      scheduledEnd: endIso ?? '',
      reasonCode: opts?.reason ?? undefined,
    } as Encounter;

    this.encounters[compositeId] = encounter;
    if (!this.encountersByPatient[patientId]) this.encountersByPatient[patientId] = [];
    this.encountersByPatient[patientId].unshift(compositeId);
    this.emitChange();
    return encounter;
  }

  // Backward compatibility alias
  async createNewAdmission(
    patientId: string,
    opts?: { reason?: string; scheduledStart?: string; scheduledEnd?: string; duration?: number }
  ): Promise<Encounter> {
    return this.createNewEncounter(patientId, opts);
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

  // Backward compatibility alias
  async createNewPatientWithAdmission(
    patientInput: { firstName: string; lastName: string; gender?: string; dateOfBirth?: string },
    admissionInput?: { reason?: string; scheduledStart?: string; scheduledEnd?: string; duration?: number }
  ): Promise<{ patient: Patient; admission: Encounter }> {
    const result = await this.createNewPatientWithEncounter(patientInput, admissionInput);
    return { patient: result.patient, admission: result.encounter };
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

  // Backward compatibility alias
  markAdmissionAsDeleted(patientId: string, admissionId: string): boolean {
    return this.markEncounterAsDeleted(patientId, admissionId);
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

  // Backward compatibility alias
  restoreAdmission(patientId: string, admissionId: string): boolean {
    return this.restoreEncounter(patientId, admissionId);
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

  // Backward compatibility alias
  permanentlyDeleteAdmission(patientId: string, admissionId: string): boolean {
    return this.permanentlyDeleteEncounter(patientId, admissionId);
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
    return patientDiagnoses.filter(dx => dx.admissionId === encounterId);
  }

  getLabResultsForEncounter(patientId: string, encounterId: string): LabResult[] {
    const patientLabs = this.labResults[patientId] || [];
    return patientLabs.filter(lab => lab.admissionId === encounterId);
  }

  // Backward compatibility aliases
  getDiagnosesForAdmission(patientId: string, admissionId: string): Diagnosis[] {
    return this.getDiagnosesForEncounter(patientId, admissionId);
  }

  getLabResultsForAdmission(patientId: string, admissionId: string): LabResult[] {
    return this.getLabResultsForEncounter(patientId, admissionId);
  }
}

// Export as singleton consistent with legacy implementation
export const supabaseDataService = new SupabaseDataService();