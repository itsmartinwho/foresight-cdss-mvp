import { getSupabaseClient } from './supabaseClient';
import { Patient, Admission, Diagnosis, LabResult, ComplexCaseAlert, Treatment } from './types';

/*
  A minimal drop-in replacement for PatientDataService when NEXT_PUBLIC_USE_SUPABASE=true.
  Only the methods currently used by the UI have been implemented.
  Any additional methods simply return empty data structures for now.
*/
class SupabaseDataService {
  private supabase = getSupabaseClient();
  private isLoaded = false;
  private isLoading = false; // New flag to prevent concurrent loads
  private patients: Record<string, Patient> = {}; // key = original PatientID (e.g., "1", "FB2ABB...")
  private admissions: Record<string, Admission> = {}; // key = composite `${patientId}_${originalAdmissionID}`
  private admissionsByPatient: Record<string, string[]> = {}; // key = original PatientID, value = array of composite admission keys
  /** Simple pub-sub so UI layers can refresh after data-mutating calls */
  private changeSubscribers: Array<() => void> = [];

  async loadPatientData(): Promise<void> {
    if (this.isLoaded || this.isLoading) {
      console.log(`SupabaseDataService (Prod Debug): Skipping load. isLoaded: ${this.isLoaded}, isLoading: ${this.isLoading}`);
      return;
    }
    this.isLoading = true;
    console.log('SupabaseDataService (Prod Debug): Starting loadPatientData...');
    this.patients = {}; // Clear previous state
    this.admissions = {};
    this.admissionsByPatient = {};

    let patientRows = null;
    try {
      const { data, error: pErr } = await this.supabase.from('patients').select('*');
      if (pErr) {
        console.error('SupabaseDataService (Prod Debug): Error fetching patients:', pErr);
        this.isLoading = false;
        throw pErr;
      }
      patientRows = data;
    } catch (error) {
      console.error('SupabaseDataService (Prod Debug): Exception during patient fetch:', error);
      this.isLoading = false; 
      return; 
    }
    
    if (!patientRows) {
        console.error('SupabaseDataService (Prod Debug): patientRows is null after fetch. Cannot proceed.');
        this.isLoading = false;
        return;
    }
    console.log(`SupabaseDataService (Prod Debug): Fetched ${patientRows.length} raw patient rows from Supabase.`);

    patientRows.forEach((row) => {
      const patient: Patient = {
        id: row.patient_id,
        name: row.name,
        firstName: row.first_name,
        lastName: row.last_name,
        gender: row.gender,
        dateOfBirth: row.dob ? new Date(row.dob).toISOString().split('T')[0] : undefined,
        photo: row.photo_url,
        race: row.race,
        maritalStatus: row.marital_status,
        language: row.language,
        povertyPercentage: row.poverty_percentage !== null ? Number(row.poverty_percentage) : undefined,
        alerts: (() => {
          const src = row.alerts ?? row.alerts_json ?? row.extra_data?.alerts ?? row.extra_data?.alertsJSON;
          if (!src) return [];
          try {
            if (Array.isArray(src)) return src as ComplexCaseAlert[];
            if (typeof src === 'string') {
              let s = src.trim();
              if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
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
      this.admissionsByPatient[patient.id] = []; 
    });
    console.log(`SupabaseDataService (Prod Debug): Processed and cached ${Object.keys(this.patients).length} patients.`);

    let visitRows = null;
    let totalVisitsAvailable = 0;
    try {
        console.log('SupabaseDataService (Prod Debug): Attempting to fetch ALL visits with count...');
        const { data, error: vErr, count } = await this.supabase
            .from('visits')
            .select('*', { count: 'exact' }); 

        if (vErr) {
            console.error('SupabaseDataService (Prod Debug): Error fetching visits:', vErr);
            this.isLoading = false;
            throw vErr;
        }
        visitRows = data;
        totalVisitsAvailable = count ?? 0;
        console.log(`SupabaseDataService (Prod Debug): Fetched ${visitRows ? visitRows.length : 0} raw visit rows. Total available according to Supabase: ${totalVisitsAvailable}`);
    } catch (error) {
        console.error('SupabaseDataService (Prod Debug): Exception during visits fetch:', error);
        this.isLoading = false; 
        return; 
    }

    if (!visitRows) {
        console.error('SupabaseDataService (Prod Debug): visitRows is null after fetch. Cannot proceed with visits.');
        // Patients are loaded, but visits are not. Consider if isLoaded should be true.
        // For now, if visits fail, we consider the load incomplete for consistent state.
        this.isLoading = false;
        return;
    }

    let visitsProcessed = 0;
    visitRows.forEach((row) => {
      const originalPatientIDFromVisitExtraData = row.extra_data?.PatientID;
      
      if (!originalPatientIDFromVisitExtraData) {
        console.warn(`SupabaseDataService (Prod Debug): Skipping visit ${row.admission_id} due to missing PatientID in extra_data. Visit extra_data:`, row.extra_data);
        return;
      }
      if (!this.patients[originalPatientIDFromVisitExtraData]) {
        console.warn(`SupabaseDataService (Prod Debug): Skipping visit ${row.admission_id}. Patient by original ID '${originalPatientIDFromVisitExtraData}' not found in loaded patients cache. Visit extra_data:`, row.extra_data);
        return;
      }

      const patientPublicId = originalPatientIDFromVisitExtraData;
      const compositeKey = `${patientPublicId}_${row.admission_id}`;

      const admission: Admission = {
        id: compositeKey, 
        patientId: patientPublicId, 
        scheduledStart: row.scheduled_start_datetime ? new Date(row.scheduled_start_datetime).toISOString() : '',
        scheduledEnd: row.scheduled_end_datetime ? new Date(row.scheduled_end_datetime).toISOString() : '',
        actualStart: row.actual_start_datetime ? new Date(row.actual_start_datetime).toISOString() : undefined,
        actualEnd: row.actual_end_datetime ? new Date(row.actual_end_datetime).toISOString() : undefined,
        reason: row.reason_for_visit,
        transcript: row.transcript,
        soapNote: row.soap_note,
        treatments: row.treatments || undefined, 
        priorAuthJustification: row.prior_auth_justification,
      };
      this.admissions[compositeKey] = admission;
      if (this.admissionsByPatient[patientPublicId]) {
        this.admissionsByPatient[patientPublicId].push(compositeKey);
      } else {
        console.warn(`SupabaseDataService (Prod Debug): Array for patient ${patientPublicId} not initialized in admissionsByPatient. Creating it now for visit ${compositeKey}. This indicates an issue in patient loading.`);
        this.admissionsByPatient[patientPublicId] = [compositeKey];
      }
      visitsProcessed++;
    });
    console.log(`SupabaseDataService (Prod Debug): Processed and cached ${visitsProcessed} visits. Total in cache: ${Object.keys(this.admissions).length}.`);

    this.isLoaded = true;
    this.isLoading = false;
    console.log('SupabaseDataService (Prod Debug): loadPatientData completed successfully.');
  }

  getAllPatients(): Patient[] {
    // console.log('SupabaseDataService (Prod Debug): getAllPatients called. isLoaded:', this.isLoaded, 'isLoading:', this.isLoading, 'Count:', Object.keys(this.patients).length);
    if (!this.isLoaded && !this.isLoading) {
        // Optionally trigger load or warn. For now, just warn vigorously if data isn't ready.
        console.error("SupabaseDataService: getAllPatients called when data not loaded and not currently loading. THIS IS A BUG in component logic or data flow.");
    }
    return Object.values(this.patients);
  }

  getPatient(patientId: string): Patient | null {
    // console.log(`SupabaseDataService (Prod Debug): getPatient called for ${patientId}. isLoaded:`, this.isLoaded, 'isLoading:', this.isLoading);
    if (!this.isLoaded && !this.isLoading) {
        console.error(`SupabaseDataService: getPatient(${patientId}) called when data not loaded and not currently loading. THIS IS A BUG.`);
    }
    return this.patients[patientId] ?? null;
  }

  getPatientAdmissions(patientId: string): Admission[] {
    // console.log(`SupabaseDataService (Prod Debug): getPatientAdmissions called for ${patientId}. isLoaded:`, this.isLoaded, 'isLoading:', this.isLoading);
     if (!this.isLoaded && !this.isLoading) {
        console.error(`SupabaseDataService: getPatientAdmissions(${patientId}) called when data not loaded and not currently loading. THIS IS A BUG.`);
    }
    const admissionKeys = this.admissionsByPatient[patientId] || [];
    return admissionKeys.map(key => this.admissions[key]).filter(Boolean) as Admission[];
  }

  getPatientData(patientId: string): any | null {
    // console.log(`SupabaseDataService (Prod Debug): getPatientData called for ${patientId}. isLoaded:`, this.isLoaded, 'isLoading:', this.isLoading);
    if (!this.isLoaded && !this.isLoading) {
       console.error(`SupabaseDataService: getPatientData(${patientId}) called when data not loaded and not currently loading. THIS IS A BUG.`);
       return null; 
    }
    const patient = this.getPatient(patientId);
    if (!patient) {
        // Warning already in getPatient if not loaded. This is if loaded but patient specifically not found.
        console.warn(`SupabaseDataService (Prod Debug): getPatientData - Patient ${patientId} not found in cache (after load attempt).`);
        return null;
    }

    const patientAdmissions = this.getPatientAdmissions(patientId);
    const admissionDetails = patientAdmissions.map(admission => ({
      admission,
      diagnoses: [] as Diagnosis[], 
      labResults: [] as LabResult[], 
    }));
    return { patient, admissions: admissionDetails };
  }

  getAllAdmissions(): { patient: Patient | null; admission: Admission }[] {
    // console.log('SupabaseDataService (Prod Debug): getAllAdmissions called. isLoaded:', this.isLoaded, 'isLoading:', this.isLoading, 'Count:', Object.keys(this.admissions).length);
    if (!this.isLoaded && !this.isLoading) {
        console.error("SupabaseDataService: getAllAdmissions called when data not loaded and not currently loading. THIS IS A BUG.");
    }
    const allAds: { patient: Patient | null; admission: Admission }[] = [];
    Object.values(this.admissions).forEach(admission => {
      const patient = this.patients[admission.patientId] ?? null;
      // if (!patient) { // This warning can be very noisy if some admissions don't have patients due to data issues
      //    console.warn(`SupabaseDataService (Prod Debug): getAllAdmissions - Patient ${admission.patientId} for admission ${admission.id} not found in cache.`);
      // }
      allAds.push({ patient, admission });
    });
    return allAds;
  }

  getUpcomingConsultations(): { patient: Patient; visit: Admission }[] {
    // console.log('SupabaseDataService (Prod Debug): getUpcomingConsultations called. isLoaded:', this.isLoaded, 'isLoading:', this.isLoading, 'Count:', Object.keys(this.admissions).length);
    if (!this.isLoaded && !this.isLoading) {
        console.error("SupabaseDataService: getUpcomingConsultations called when data not loaded and not currently loading. THIS IS A BUG.");
    }
    const upcoming: { patient: Patient; visit: Admission }[] = [];
    const now = new Date();
    const nowTime = now.getTime();

    Object.values(this.admissions).forEach(ad => {
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

  async updateAdmissionTranscript(patientId: string, admissionCompositeId: string, transcript: string): Promise<void> {
    const originalAdmissionId = admissionCompositeId.split('_').slice(-1)[0];
    const { error } = await this.supabase
      .from('visits')
      .update({ transcript: transcript })
      .eq('admission_id', originalAdmissionId);
    if (error) {
      console.error('SupabaseDataService (Prod Debug): Error updating transcript in DB:', error.message);
      throw error;
    }
    if (this.admissions[admissionCompositeId]) {
      this.admissions[admissionCompositeId].transcript = transcript;
    } else {
      console.warn(`SupabaseDataService (Prod Debug): updateAdmissionTranscript - Admission with composite ID ${admissionCompositeId} not found in local cache to update.`);
    }
  }

  async createNewAdmission(
    patientId: string,
    opts?: { reason?: string; scheduledStart?: string; scheduledEnd?: string }
  ): Promise<Admission> {
    if (!this.patients[patientId]) {
      console.error(`SupabaseDataService (Prod Debug): Cannot create admission. Patient with original ID ${patientId} not found in local cache. Potential race condition or data not loaded.`);
      // Attempt to load data if not loaded, or re-throw if critical path expects patient to be there.
      if (!this.isLoaded && !this.isLoading) {
        console.warn('SupabaseDataService (Prod Debug): createNewAdmission called before initial data load. Attempting load now...');
        await this.loadPatientData();
        // Check again after load attempt
        if (!this.patients[patientId]) {
          throw new Error(`Patient with original ID ${patientId} still not found after reload attempt.`);
        }
      } else if (this.isLoading) {
        throw new Error(`Data is currently loading. Cannot create new admission for patient ${patientId} yet.`);
      } else {
        throw new Error(`Patient with original ID ${patientId} not found. Data may not be fully loaded.`);
      }
    }

    // Very minimal in-memory fallback implementation so that the UI can continue to operate
    const newAdmissionId = crypto.randomUUID();
    const compositeId = `${patientId}_${newAdmissionId}`;
    const nowIso = new Date().toISOString();
    const admission: Admission = {
      id: compositeId,
      patientId,
      scheduledStart: opts?.scheduledStart ?? nowIso,
      scheduledEnd: opts?.scheduledEnd ?? nowIso,
      actualStart: undefined,
      actualEnd: undefined,
      reason: opts?.reason ?? undefined,
    } as Admission;

    this.admissions[compositeId] = admission;
    if (!this.admissionsByPatient[patientId]) this.admissionsByPatient[patientId] = [];
    this.admissionsByPatient[patientId].push(compositeId);
    this.emitChange();
    return admission;
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
    this.admissionsByPatient[newId] = [];
    this.emitChange();
    return patient;
  }

  async createNewPatientWithAdmission(
    patientInput: { firstName: string; lastName: string; gender?: string; dateOfBirth?: string },
    admissionInput?: { reason?: string; scheduledStart?: string; scheduledEnd?: string }
  ): Promise<{ patient: Patient; admission: Admission }> {
    const patient = await this.createNewPatient(patientInput);
    const admission = await this.createNewAdmission(patient.id, admissionInput);
    return { patient, admission };
  }
}

// Export as singleton consistent with legacy implementation
export const supabaseDataService = new SupabaseDataService();