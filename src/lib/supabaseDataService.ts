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
  private patients: Record<string, Patient> = {}; // key = original PatientID (e.g., "1", "FB2ABB...")
  private admissions: Record<string, Admission> = {}; // key = composite `${patientId}_${originalAdmissionID}`
  private admissionsByPatient: Record<string, string[]> = {}; // key = original PatientID, value = array of composite admission keys

  async loadPatientData(): Promise<void> {
    if (this.isLoaded) {
      console.log('SupabaseDataService: Data already loaded. Skipping.');
      return;
    }
    console.log('SupabaseDataService: Loading patient data with new unbundled schema...');

    // 1. Fetch Patients
    const { data: patientRows, error: pErr } = await this.supabase.from('patients').select('*');
    if (pErr) {
      console.error('SupabaseDataService: Error fetching patients:', pErr);
      throw pErr;
    }

    this.patients = {};
    this.admissionsByPatient = {}; // Reset for fresh load

    patientRows?.forEach((row) => {
      const patient: Patient = {
        id: row.patient_id, // Original PatientID from TSV, stored in patient_id column
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
        alerts: row.alerts || [], // Expecting Supabase to return JSONB as parsed array
        primaryDiagnosis: row.primary_diagnosis_description,
        diagnosis: row.general_diagnosis_details,
        nextAppointment: row.next_appointment_date ? new Date(row.next_appointment_date).toISOString() : undefined,
        reason: row.patient_level_reason,
      };
      this.patients[patient.id] = patient;
      this.admissionsByPatient[patient.id] = []; // Initialize for this patient
    });
    console.log(`SupabaseDataService: Loaded ${Object.keys(this.patients).length} patients.`);

    // 2. Fetch Visits
    const { data: visitRows, error: vErr } = await this.supabase.from('visits').select('*');
    if (vErr) {
      console.error('SupabaseDataService: Error fetching visits:', vErr);
      throw vErr;
    }
    this.admissions = {}; // Reset for fresh load

    visitRows?.forEach((row) => {
      // The patient_id in visits table from migration script refers to the original PatientID (text)
      // For FK, the migration script maps original PatientID to patients.id (UUID) and stores it in visits.patient_supabase_id
      // However, our `extra_data` in visits *still* contains the original `PatientID`.
      // We need to find the patient from our `this.patients` map using the original PatientID from `extra_data`.
      const originalPatientIDFromVisitExtraData = row.extra_data?.PatientID;
      
      if (!originalPatientIDFromVisitExtraData || !this.patients[originalPatientIDFromVisitExtraData]) {
        console.warn(`SupabaseDataService: Skipping visit ${row.admission_id}. Patient by original ID '${originalPatientIDFromVisitExtraData}' not found in loaded patients cache. Visit extra_data:`, row.extra_data);
        return;
      }

      const patientPublicId = originalPatientIDFromVisitExtraData;
      const compositeKey = `${patientPublicId}_${row.admission_id}`;

      const admission: Admission = {
        id: compositeKey, // Composite key for UI and internal caching
        patientId: patientPublicId, // Original PatientID
        scheduledStart: row.scheduled_start_datetime ? new Date(row.scheduled_start_datetime).toISOString() : '',
        scheduledEnd: row.scheduled_end_datetime ? new Date(row.scheduled_end_datetime).toISOString() : '',
        actualStart: row.actual_start_datetime ? new Date(row.actual_start_datetime).toISOString() : undefined,
        actualEnd: row.actual_end_datetime ? new Date(row.actual_end_datetime).toISOString() : undefined,
        reason: row.reason_for_visit,
        transcript: row.transcript,
        soapNote: row.soap_note,
        treatments: row.treatments || undefined, // Expecting Supabase to return JSONB as parsed array or null
        priorAuthJustification: row.prior_auth_justification,
        // insuranceStatus: row.insurance_status, // Assuming this field is in your Admission type and visits table
      };
      this.admissions[compositeKey] = admission;
      if (this.admissionsByPatient[patientPublicId]) {
        this.admissionsByPatient[patientPublicId].push(compositeKey);
      } else {
        // This case should ideally not happen if patients are processed first and admissionsByPatient is initialized
        console.warn(`SupabaseDataService: Encountered visit for patient ${patientPublicId} before patient was initialized in admissionsByPatient map. Visit ID: ${row.admission_id}`);
        this.admissionsByPatient[patientPublicId] = [compositeKey];
      }
    });
    console.log(`SupabaseDataService: Loaded ${Object.keys(this.admissions).length} admissions.`);

    this.isLoaded = true;
  }

  getAllPatients(): Patient[] {
    if (!this.isLoaded) console.warn("SupabaseDataService: getAllPatients called before data loaded. Call loadPatientData() first.");
    return Object.values(this.patients);
  }

  getPatient(patientId: string): Patient | null {
    if (!this.isLoaded) console.warn("SupabaseDataService: getPatient called before data loaded. Call loadPatientData() first.");
    return this.patients[patientId] ?? null;
  }

  getPatientAdmissions(patientId: string): Admission[] {
    if (!this.isLoaded) console.warn("SupabaseDataService: getPatientAdmissions called before data loaded. Call loadPatientData() first.");
    const admissionKeys = this.admissionsByPatient[patientId] || [];
    return admissionKeys.map(key => this.admissions[key]).filter(Boolean) as Admission[];
  }

  getPatientData(patientId: string): any | null {
    if (!this.isLoaded) {
       console.warn("SupabaseDataService: getPatientData called before data loaded. Call loadPatientData() first.");
       return null; // Or trigger loadPatientData if appropriate for your app flow
    }
    const patient = this.getPatient(patientId);
    if (!patient) {
        console.warn(`SupabaseDataService: getPatientData - Patient ${patientId} not found in cache.`);
        return null;
    }

    const patientAdmissions = this.getPatientAdmissions(patientId);
    const admissionDetails = patientAdmissions.map(admission => ({
      admission,
      diagnoses: [] as Diagnosis[], // Placeholder - to be populated if diagnoses are moved to separate table or field
      labResults: [] as LabResult[], // Placeholder
    }));
    return { patient, admissions: admissionDetails };
  }

  getAllAdmissions(): { patient: Patient | null; admission: Admission }[] {
    if (!this.isLoaded) console.warn("SupabaseDataService: getAllAdmissions called before data loaded. Call loadPatientData() first.");
    const allAds: { patient: Patient | null; admission: Admission }[] = [];
    Object.values(this.admissions).forEach(admission => {
      const patient = this.patients[admission.patientId] ?? null;
      if (!patient) {
         console.warn(`SupabaseDataService: getAllAdmissions - Patient ${admission.patientId} for admission ${admission.id} not found in cache.`);
      }
      allAds.push({ patient, admission });
    });
    return allAds;
  }

  getUpcomingConsultations(): { patient: Patient; visit: Admission }[] {
    if (!this.isLoaded) console.warn("SupabaseDataService: getUpcomingConsultations called before data loaded. Call loadPatientData() first.");
    const upcoming: { patient: Patient; visit: Admission }[] = [];
    const now = new Date();
    const nowTime = now.getTime();
    // console.log(`SupabaseDataService: getUpcomingConsultations called at ${now.toISOString()}. Found ${Object.keys(this.admissions).length} total admissions.`);

    Object.values(this.admissions).forEach(ad => {
      if (ad.scheduledStart && typeof ad.scheduledStart === 'string' && ad.scheduledStart.length > 0) {
        try {
          const startDate = new Date(ad.scheduledStart);
          const startTime = startDate.getTime();
          if (startDate instanceof Date && !isNaN(startTime)) {
            const isInFuture = startTime > nowTime;
            // if (Math.abs(startTime - nowTime) < 86400000 * 30 || isInFuture) { // Log dates within 30 days or in future
            //    console.log(`SupabaseDataService: Checking visit ${ad.id}. Scheduled: ${ad.scheduledStart} (${startDate.toISOString()}). Is in future? ${isInFuture}. Now: ${now.toISOString()}`);
            // }
            if (isInFuture) {
              const patient = this.patients[ad.patientId];
              if (patient) {
                upcoming.push({ patient, visit: ad });
              } else {
                 console.warn(`SupabaseDataService: Found upcoming visit ${ad.id} but patient ${ad.patientId} not found in cache.`);
              }
            }
          } else {
             console.warn(`SupabaseDataService: Invalid date object after parsing scheduledStart for admission ${ad.id}. Original string: ${ad.scheduledStart}`);
          }
        } catch (e) {
            console.warn(`SupabaseDataService: Error processing date for admission ${ad.id}. Original string: ${ad.scheduledStart}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        // console.log(`SupabaseDataService: Skipping visit ${ad.id} due to missing, empty or non-string scheduledStart:`, ad.scheduledStart);
      }
    });
    // console.log(`SupabaseDataService: Found ${upcoming.length} upcoming consultations.`);
    return upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
  }

  async updateAdmissionTranscript(patientId: string, admissionCompositeId: string, transcript: string): Promise<void> {
    const originalAdmissionId = admissionCompositeId.split('_').slice(-1)[0];
    const { error } = await this.supabase
      .from('visits')
      .update({ transcript: transcript })
      .eq('admission_id', originalAdmissionId);
    if (error) {
      console.error('SupabaseDataService: Error updating transcript in DB:', error.message);
      throw error;
    }
    if (this.admissions[admissionCompositeId]) {
      this.admissions[admissionCompositeId].transcript = transcript;
    } else {
      console.warn(`SupabaseDataService: updateAdmissionTranscript - Admission with composite ID ${admissionCompositeId} not found in local cache to update.`);
    }
  }

  async createNewAdmission(patientId: string): Promise<Admission> {
    if (!this.patients[patientId]) {
      console.error(`SupabaseDataService: Cannot create admission. Patient with original ID ${patientId} not found in local cache.`);
      throw new Error(`Patient with original ID ${patientId} not found. Data may not be fully loaded.`);
    }
    
    const { data: patientDBRecord, error: patientFetchError } = await this.supabase
        .from('patients')
        .select('id') // This is the Supabase internal UUID
        .eq('patient_id', patientId) // patientId is the original TSV PatientID
        .single();

    if (patientFetchError || !patientDBRecord) {
        console.error('SupabaseDataService: Failed to fetch patient internal UUID from DB for new admission:', patientFetchError);
        throw new Error('Could not find patient in database to create new admission.');
    }
    const internalSupabasePatientUUID = patientDBRecord.id;

    const now = new Date();
    const nowIso = now.toISOString();
    // Use a UUID for the new admission_id to ensure uniqueness, rather than just 'NEW_...'
    const newOriginalAdmissionId = crypto.randomUUID(); 

    const newDbVisit = {
      admission_id: newOriginalAdmissionId, 
      patient_supabase_id: internalSupabasePatientUUID,
      admission_type: 'consultation',
      scheduled_start_datetime: nowIso, // For a new consult, scheduled and actual can be same initially
      actual_start_datetime: nowIso,
      reason_for_visit: 'New Consultation',
      // Populate other new dedicated columns with defaults or nulls
      transcript: '', 
      soap_note: null,
      treatments: null, 
      prior_auth_justification: null,
      insurance_status: null, 
      scheduled_end_datetime: null,
      actual_end_datetime: null,
      extra_data: { // Minimal extra_data, primarily for back-reference if needed
        PatientID: patientId, 
        AdmissionID: newOriginalAdmissionId,
        CreatedByType: 'application' 
      }
    };

    const { data: insertedVisitData, error: insertError } = await this.supabase
      .from('visits')
      .insert(newDbVisit)
      .select('*') // Select all columns of the newly inserted visit
      .single();

    if (insertError || !insertedVisitData) {
      console.error('SupabaseDataService: Error inserting new admission to DB:', insertError?.message);
      throw insertError || new Error('Failed to insert new admission or retrieve it post-insertion.');
    }

    // Construct the Admission object for the cache and UI using data from insertedVisitData
    const newAdmissionCompositeId = `${patientId}_${insertedVisitData.admission_id}`;
    const newAdmission: Admission = {
      id: newAdmissionCompositeId,
      patientId: patientId,
      scheduledStart: insertedVisitData.scheduled_start_datetime ? new Date(insertedVisitData.scheduled_start_datetime).toISOString() : '',
      scheduledEnd: insertedVisitData.scheduled_end_datetime ? new Date(insertedVisitData.scheduled_end_datetime).toISOString() : '',
      actualStart: insertedVisitData.actual_start_datetime ? new Date(insertedVisitData.actual_start_datetime).toISOString() : undefined,
      actualEnd: insertedVisitData.actual_end_datetime ? new Date(insertedVisitData.actual_end_datetime).toISOString() : undefined,
      reason: insertedVisitData.reason_for_visit,
      transcript: insertedVisitData.transcript,
      soapNote: insertedVisitData.soap_note,
      treatments: insertedVisitData.treatments || undefined,
      priorAuthJustification: insertedVisitData.prior_auth_justification,
      // insuranceStatus: insertedVisitData.insurance_status, 
    };

    // Update local cache
    this.admissions[newAdmissionCompositeId] = newAdmission;
    if (!this.admissionsByPatient[patientId]) {
      this.admissionsByPatient[patientId] = [];
    }
    this.admissionsByPatient[patientId].push(newAdmissionCompositeId);
    console.log(`SupabaseDataService: Created and cached new admission ${newAdmissionCompositeId} for patient ${patientId}`);
    return newAdmission;
  }
}

export const supabaseDataService = new SupabaseDataService(); 