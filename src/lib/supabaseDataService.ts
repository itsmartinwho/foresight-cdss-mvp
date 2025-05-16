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
  private isLoading = false; // This will be managed by loadPromise
  private loadPromise: Promise<void> | null = null;
  private patients: Record<string, Patient> = {}; // key = original PatientID (e.g., "1", "FB2ABB...")
  private admissions: Record<string, Admission> = {}; // key = composite `${patientId}_${originalAdmissionID}`
  private admissionsByPatient: Record<string, string[]> = {}; // key = original PatientID, value = array of composite admission keys
  /** Simple pub-sub so UI layers can refresh after data-mutating calls */
  private changeSubscribers: Array<() => void> = [];

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
      this.admissions = {};
      this.admissionsByPatient = {};

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
      console.log(`SupabaseDataService (Prod Debug): Fetched ${patientRows.length} raw patient rows from Supabase.`);

      patientRows.forEach((row) => {
        console.log(`SupabaseDataService (Prod Debug): Processing patient row: ${row.patient_id}`, row);
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
        console.log(`SupabaseDataService (Prod Debug): Chosen alerts source for patient ${row.patient_id}: ${chosenKey}`, chosenRawAlerts);
        const rawAlertsData = chosenRawAlerts;
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
                console.log(`SupabaseDataService (Prod Debug): Parsed alerts from string for patient ${row.patient_id}:`, parsed);
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
        console.log(`SupabaseDataService (Prod Debug): Processed patient object for ${patient.id}:`, patient);
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
              throw vErr;
          }
          visitRows = data;
          totalVisitsAvailable = count ?? 0;
          console.log(`SupabaseDataService (Prod Debug): Fetched ${visitRows ? visitRows.length : 0} raw visit rows. Total available: ${totalVisitsAvailable}`);
      } catch (error) {
          console.error('SupabaseDataService (Prod Debug): Exception during visits fetch:', error);
          this.loadPromise = null; 
          // this.isLoading = false;
          throw error;
      }

      if (!visitRows) {
          console.error('SupabaseDataService (Prod Debug): visitRows is null after fetch. Cannot proceed with visits.');
          this.loadPromise = null;
          // this.isLoading = false;
          throw new Error("Visit rows fetch returned null.");
      }

      let visitsProcessed = 0;
      visitRows.forEach((row) => {
        const originalPatientIDFromVisitExtraData = row.extra_data?.PatientID;
        
        if (!originalPatientIDFromVisitExtraData) {
          console.warn(`SupabaseDataService (Prod Debug): Skipping visit ${row.admission_id} due to missing PatientID in extra_data.`);
          return;
        }
        if (!this.patients[originalPatientIDFromVisitExtraData]) {
          console.warn(`SupabaseDataService (Prod Debug): Skipping visit ${row.admission_id}. Patient by original ID '${originalPatientIDFromVisitExtraData}' not found.`);
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
          isDeleted: !!row.is_deleted, // Ensure this mapping is correct
        };
        this.admissions[compositeKey] = admission;
        if (this.admissionsByPatient[patientPublicId]) {
          this.admissionsByPatient[patientPublicId].push(compositeKey);
        } else {
          this.admissionsByPatient[patientPublicId] = [compositeKey];
        }
        visitsProcessed++;
      });
      console.log(`SupabaseDataService (Prod Debug): Processed and cached ${visitsProcessed} visits. Total in cache: ${Object.keys(this.admissions).length}.`);

      this.isLoaded = true;
      // this.isLoading = false;
      this.loadPromise = null; // Clear the promise, so next call will trigger a new load if isLoaded becomes false
      console.log('SupabaseDataService (Prod Debug): loadPatientData completed successfully.');
      this.emitChange(); // Notify subscribers that data is loaded/updated.
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
    // console.log(`SupabaseDataService (Prod Debug): getPatient called for ${patientId}. isLoaded:`, this.isLoaded, 'isLoading:', this.isLoading);
    if (!this.isLoaded && !this.isLoading) {
        console.error(`SupabaseDataService: getPatient(${patientId}) called when data not loaded and not currently loading. THIS IS A BUG.`);
    }
    return this.patients[patientId] ?? null;
  }

  getPatientAdmissions(patientId: string): Admission[] {
    if (!this.isLoaded && !this.isLoading) {
        this.loadPatientData().catch(() => {/* handled elsewhere */});
        return [];
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
      if ((admission as any).isDeleted) return; // skip deleted
      const patient = this.patients[admission.patientId] ?? null;
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
    // Ensure patient exists (reload on demand)
    if (!this.patients[patientId]) {
      if (!this.isLoaded && !this.isLoading) {
        await this.loadPatientData();
      }
      if (!this.patients[patientId]) {
        throw new Error(`Patient with original ID ${patientId} not found in cache; cannot create admission.`);
      }
    }

    const newAdmissionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Insert into DB
    const { error: insertErr } = await this.supabase.from('visits').insert([
      {
        admission_id: newAdmissionId,
        reason_for_visit: opts?.reason ?? null,
        scheduled_start_datetime: opts?.scheduledStart ?? nowIso,
        scheduled_end_datetime: opts?.scheduledEnd ?? null,
        actual_start_datetime: null,
        actual_end_datetime: null,
        is_deleted: false,
        extra_data: { PatientID: patientId },
      },
    ]);

    if (insertErr) {
      console.error('SupabaseDataService: Failed to insert new admission into DB', insertErr);
      throw insertErr;
    }

    // Build local cache record
    const compositeId = `${patientId}_${newAdmissionId}`;
    const admission: Admission = {
      id: compositeId,
      patientId,
      scheduledStart: opts?.scheduledStart ?? nowIso,
      scheduledEnd: opts?.scheduledEnd ?? '',
      reason: opts?.reason ?? undefined,
    } as Admission;

    this.admissions[compositeId] = admission;
    if (!this.admissionsByPatient[patientId]) this.admissionsByPatient[patientId] = [];
    this.admissionsByPatient[patientId].unshift(compositeId);
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

    const { error: insertErr } = await this.supabase.from('patients').insert([
      {
        patient_id: newId,
        first_name: input.firstName,
        last_name: input.lastName,
        gender: input.gender ?? null,
        dob: input.dateOfBirth ?? null,
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

  // ------------------------------------------------------------------
  // Soft delete helpers (in-memory updates; DB persistence TBD)
  // ------------------------------------------------------------------
  /**
   * Mark an admission as deleted (soft delete).
   * Returns true if admission exists and was marked deleted.
   */
  markAdmissionAsDeleted(patientId: string, admissionId: string): boolean {
    const ad = this.admissions[admissionId];
    if (!ad || ad.patientId !== patientId) return false;
    if (ad.isDeleted) return true; // already deleted

    // Update in-memory cache first for immediate UI feedback
    (ad as Admission).isDeleted = true;

    // Persist to DB in background (try both candidate PK column names)
    const originalAdmissionId = admissionId.split('_').slice(-1)[0];
    this.supabase.from('visits')
      .update({ is_deleted: true })
      .eq('admission_id', originalAdmissionId)
      .then(async ({ error, data }) => {
        if (error) {
          console.error('SupabaseDataService: update by admission_id failed', JSON.stringify(error, null, 2));
          // Attempt alternative column
          const { error: err2 } = await this.supabase.from('visits')
            .update({ is_deleted: true })
            .eq('id', originalAdmissionId);
          if (err2) {
            console.error('SupabaseDataService: update by id failed', JSON.stringify(err2, null,2));
          }
        }
      });

    this.emitChange();
    return true;
  }

  /** Restore a previously soft-deleted admission */
  restoreAdmission(patientId: string, admissionId: string): boolean {
    const ad = this.admissions[admissionId];
    if (!ad || ad.patientId !== patientId) return false;
    if (!ad.isDeleted) return true; // already active

    delete (ad as any).isDeleted;

    // Persist to DB in background (try both candidate PK column names)
    const originalAdmissionId = admissionId.split('_').slice(-1)[0];
    this.supabase.from('visits')
      .update({ is_deleted: false })
      .eq('admission_id', originalAdmissionId)
      .then(async ({ error }) => {
        if (error) {
          console.error('SupabaseDataService: restore update admission_id failed', JSON.stringify(error, null,2));
          const { error: err2 } = await this.supabase.from('visits')
            .update({ is_deleted: false })
            .eq('id', originalAdmissionId);
          if (err2) {
            console.error('SupabaseDataService: restore update id failed', JSON.stringify(err2, null,2));
          }
        }
      });

    this.emitChange();
    return true;
  }

  /** Permanently remove an admission from cache (DB removal TBD) */
  permanentlyDeleteAdmission(patientId: string, admissionId: string): boolean {
    const ad = this.admissions[admissionId];
    if (!ad || ad.patientId !== patientId) return false;

    // Remove from in-memory maps first for immediate UI update
    delete this.admissions[admissionId];
    if (this.admissionsByPatient[patientId]) {
      this.admissionsByPatient[patientId] = this.admissionsByPatient[patientId].filter(key => key !== admissionId);
    }

    // Delete from DB in background (try both candidate PK column names)
    const originalAdmissionId = admissionId.split('_').slice(-1)[0];
    this.supabase.from('visits')
      .delete()
      .eq('admission_id', originalAdmissionId)
      .then(async ({ error }) => {
        if (error) {
          console.error('SupabaseDataService: delete admission_id failed', JSON.stringify(error, null,2));
          const { error: err2 } = await this.supabase.from('visits')
            .delete()
            .eq('id', originalAdmissionId);
          if (err2) {
            console.error('SupabaseDataService: delete id failed', JSON.stringify(err2, null,2));
          }
        }
      });

    this.emitChange();
    return true;
  }

  unsubscribe(cb: () => void) {
    this.changeSubscribers = this.changeSubscribers.filter(sub => sub !== cb);
    console.log("SupabaseDataService (Prod Debug): Unsubscribed a callback. Total subscribers:", this.changeSubscribers.length);
  }
}

// Export as singleton consistent with legacy implementation
export const supabaseDataService = new SupabaseDataService();