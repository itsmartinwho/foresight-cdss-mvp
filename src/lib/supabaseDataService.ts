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
  private patients: Record<string, Patient> = {}; // key = original PatientID
  private admissions: Record<string, Admission> = {}; // key = composite `${patientId}_${AdmissionID}` (ensures global uniqueness)
  private admissionsByPatient: Record<string, string[]> = {}; // key = original PatientID, value = array of composite admission keys

  private parseAlerts(patientId: string, alertsJsonField: any): ComplexCaseAlert[] {
    if (alertsJsonField && typeof alertsJsonField === 'string' && alertsJsonField.trim().length > 0 && alertsJsonField.trim() !== '[]') {
      let jsonStringToParse = alertsJsonField;
      try {
        // First attempt to parse, in case it's a string that IS valid JSON (e.g., already processed or correctly stored)
        let potentialAlerts = JSON.parse(jsonStringToParse);

        // If the result of the first parse is STILL a string, it means it was double-stringified.
        // This inner string is the one that likely contains '''' instead of ''.
        if (typeof potentialAlerts === 'string') {
          jsonStringToParse = potentialAlerts.replace(/""/g, '"'); // Replace '''' with ''.
          potentialAlerts = JSON.parse(jsonStringToParse); // Parse again
        }

        if (Array.isArray(potentialAlerts)) {
          const validAlerts = potentialAlerts.filter((al: any) => al && typeof al.id === 'string' && typeof al.msg === 'string');
          if (validAlerts.length > 0) {
            // console.log(`SupabaseDataService: Successfully parsed ${validAlerts.length} alerts for patient ${patientId}.`);
          }
          return validAlerts;
        } else {
          console.warn(`SupabaseDataService: Parsed alertsJSON for patient ${patientId}, but result was not an array:`, potentialAlerts);
        }
      } catch (e) {
        console.warn(`SupabaseDataService: Failed to parse alertsJSON for patient ${patientId}. Error: ${e instanceof Error ? e.message : String(e)}. Original string: `, alertsJsonField, 'Attempted to parse:', jsonStringToParse);
      }
    } else if (alertsJsonField) {
      // console.log(`SupabaseDataService: alertsJSON field present but empty/default for patient ${patientId}.`);
    }
    return [];
  }

  private parseTreatments(admissionId: string, treatmentsJsonField: any): Treatment[] | undefined {
    if (treatmentsJsonField && typeof treatmentsJsonField === 'string' && treatmentsJsonField.trim().length > 0 && treatmentsJsonField.trim() !== '[]') {
      let jsonStringToParse = treatmentsJsonField;
      try {
        let potentialTreatments = JSON.parse(jsonStringToParse);

        if (typeof potentialTreatments === 'string') {
          jsonStringToParse = potentialTreatments.replace(/""/g, '"');
          potentialTreatments = JSON.parse(jsonStringToParse);
        }

        if (Array.isArray(potentialTreatments)) {
          const validTreatments = potentialTreatments.filter((tr: any) => tr && typeof tr.drug === 'string');
           if (validTreatments.length > 0) {
            // console.log(`SupabaseDataService: Successfully parsed ${validTreatments.length} treatments for admission ${admissionId}.`);
          }
          return validTreatments.length > 0 ? validTreatments : undefined;
        } else {
          console.warn(`SupabaseDataService: Parsed treatmentsJSON for admission ${admissionId}, but result was not an array:`, potentialTreatments);
        }
      } catch (e) {
        console.warn(`SupabaseDataService: Failed to parse treatmentsJSON for admission ${admissionId}. Error: ${e instanceof Error ? e.message : String(e)}. Original string:`, treatmentsJsonField, 'Attempted to parse:', jsonStringToParse);
      }
    }
    return undefined;
  }

  async loadPatientData(): Promise<void> {
    if (this.isLoaded) return;
    console.log('SupabaseDataService: Loading patient data...');

    const { data: patientRows, error: pErr } = await this.supabase.from('patients').select('*');
    if (pErr) {
      console.error('Error fetching patients:', pErr);
      throw pErr;
    }

    this.patients = {};
    this.admissionsByPatient = {};

    patientRows?.forEach((row) => {
      const ed = row.extra_data || {}; // ed for extra_data
      const patient: Patient = {
        id: row.patient_id, // This is the original PatientID from TSV
        name: row.name,
        firstName: ed.firstName,
        lastName: ed.lastName,
        gender: row.gender,
        dateOfBirth: row.dob ? new Date(row.dob).toISOString().split('T')[0] : undefined,
        photo: row.photo_url,
        race: ed.PatientRace,
        maritalStatus: ed.PatientMaritalStatus,
        language: ed.PatientLanguage,
        povertyPercentage: parseFloat(ed.PatientPopulationPercentageBelowPoverty) || undefined,
        alerts: this.parseAlerts(row.patient_id, ed.alertsJSON),
        // Fields from old service if available in extra_data:
        primaryDiagnosis: ed.PrimaryDiagnosis, 
        diagnosis: ed.Diagnosis, // This might be a general diagnosis field
        nextAppointment: ed.NextAppointmentDate, // Assuming these names
        reason: ed.PatientReason, // A general patient-level reason
      };
      this.patients[patient.id] = patient;
      if (!this.admissionsByPatient[patient.id]) {
        this.admissionsByPatient[patient.id] = [];
      }
    });
    console.log(`SupabaseDataService: Loaded ${Object.keys(this.patients).length} patients.`);

    const { data: visitRows, error: vErr } = await this.supabase.from('visits').select('*');
    if (vErr) {
      console.error('Error fetching visits:', vErr);
      throw vErr;
    }
    this.admissions = {};

    visitRows?.forEach((row) => {
      const ed = row.extra_data || {}; // ed for extra_data
      const patientPublicId = ed.PatientID;
      if (!patientPublicId || !this.patients[patientPublicId]) {
        console.warn(`SupabaseDataService: Skipping visit ${row.admission_id} as its patient ${patientPublicId} was not found or PatientID missing in extra_data.`);
        return;
      }

      let scheduledStart = '';
      let scheduledEnd = '';

      if (ed.ScheduledStartDateTime && typeof ed.ScheduledStartDateTime === 'string') {
        try {
          scheduledStart = new Date(ed.ScheduledStartDateTime).toISOString();
        } catch (e) {
          console.warn(`SupabaseDataService: Invalid ScheduledStartDateTime format in extra_data for visit ${row.admission_id}, patient ${patientPublicId}: ${ed.ScheduledStartDateTime}`);
        }
      }
      if (!scheduledStart && row.started_at) {
        try {
          scheduledStart = new Date(row.started_at).toISOString();
        } catch (e) {
          console.warn(`SupabaseDataService: Invalid started_at format in row for visit ${row.admission_id}, patient ${patientPublicId}: ${row.started_at}`);
        }
      }

      if (ed.ScheduledEndDateTime && typeof ed.ScheduledEndDateTime === 'string') {
        try {
          scheduledEnd = new Date(ed.ScheduledEndDateTime).toISOString();
        } catch (e) {
          console.warn(`SupabaseDataService: Invalid ScheduledEndDateTime format in extra_data for visit ${row.admission_id}, patient ${patientPublicId}: ${ed.ScheduledEndDateTime}`);
        }
      }
      if (!scheduledEnd && row.discharge_time) {
        try {
          scheduledEnd = new Date(row.discharge_time).toISOString();
        } catch (e) {
          console.warn(`SupabaseDataService: Invalid discharge_time format in row for visit ${row.admission_id}, patient ${patientPublicId}: ${row.discharge_time}`);
        }
      }

      const compositeKey = `${patientPublicId}_${row.admission_id}`; // Ensure uniqueness across patients
      const admission: Admission = {
        id: compositeKey, // Use composite key internally/UI
        patientId: patientPublicId,
        scheduledStart,
        scheduledEnd,
        actualStart: scheduledStart || undefined, 
        actualEnd: scheduledEnd || undefined, 
        reason: ed.ReasonForVisit || ed.EncounterReason || ed.admission_reason, // Added ed.admission_reason as another fallback
        transcript: ed.transcript || row.transcript, // Check extra_data first, then direct column if schema changes
        soapNote: ed.soapNote,
        treatments: this.parseTreatments(row.admission_id, ed.treatmentsJSON),
        priorAuthJustification: ed.priorAuthJustification,
      };
      this.admissions[compositeKey] = admission; // Store by composite key
      if (this.admissionsByPatient[patientPublicId]) {
         this.admissionsByPatient[patientPublicId].push(compositeKey);
      } else {
         this.admissionsByPatient[patientPublicId] = [compositeKey];
      }
    });
    console.log(`SupabaseDataService: Loaded ${Object.keys(this.admissions).length} admissions.`);

    this.isLoaded = true;
  }

  getAllPatients(): Patient[] {
    if (!this.isLoaded) console.warn("getAllPatients called before data loaded");
    return Object.values(this.patients);
  }

  getPatient(patientId: string): Patient | null {
    if (!this.isLoaded) console.warn("getPatient called before data loaded");
    return this.patients[patientId] ?? null;
  }

  getPatientAdmissions(patientId: string): Admission[] {
    if (!this.isLoaded) console.warn("getPatientAdmissions called before data loaded");
    const admissionKeys = this.admissionsByPatient[patientId] || [];
    return admissionKeys.map(key => this.admissions[key]).filter(Boolean) as Admission[];
  }

  getPatientData(patientId: string): any | null {
    if (!this.isLoaded) console.warn("getPatientData called before data loaded");
    const patient = this.getPatient(patientId);
    if (!patient) return null;

    const patientAdmissions = this.getPatientAdmissions(patientId);
    const admissionDetails = patientAdmissions.map(admission => ({
      admission,
      diagnoses: [] as Diagnosis[], // Placeholder for now
      labResults: [] as LabResult[], // Placeholder for now
    }));
    return { patient, admissions: admissionDetails };
  }

  getAllAdmissions(): { patient: Patient | null; admission: Admission }[] {
    if (!this.isLoaded) console.warn("getAllAdmissions called before data loaded");
    const allAds: { patient: Patient | null; admission: Admission }[] = [];
    Object.values(this.admissions).forEach(admission => {
      const patient = this.patients[admission.patientId] ?? null;
      allAds.push({ patient, admission });
    });
    return allAds;
  }

  getUpcomingConsultations(): { patient: Patient; visit: Admission }[] {
    if (!this.isLoaded) console.warn("SupabaseDataService: getUpcomingConsultations called before data loaded");
    const upcoming: { patient: Patient; visit: Admission }[] = [];
    const now = new Date();
    const nowTime = now.getTime();
    console.log(`SupabaseDataService: getUpcomingConsultations called at ${now.toISOString()}. Found ${Object.keys(this.admissions).length} total admissions.`);

    Object.values(this.admissions).forEach(ad => {
      if (ad.scheduledStart && typeof ad.scheduledStart === 'string') {
        try {
          const startDate = new Date(ad.scheduledStart);
          const startTime = startDate.getTime();

          if (startDate instanceof Date && !isNaN(startTime)) {
            const isInFuture = startTime > nowTime;
            if (Math.abs(startTime - nowTime) < 86400000 * 30 || isInFuture) {
              console.log(`SupabaseDataService: Checking visit ${ad.id}. Scheduled: ${ad.scheduledStart} (${startDate.toISOString()}). Is in future? ${isInFuture}. Now: ${now.toISOString()}`);
            }

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
         // Log if scheduledStart is missing or not a string
         // console.log(`SupabaseDataService: Skipping visit ${ad.id} due to missing or non-string scheduledStart:`, ad.scheduledStart);
      }
    });
    console.log(`SupabaseDataService: Found ${upcoming.length} upcoming consultations.`);
    return upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
  }

  async updateAdmissionTranscript(patientId: string, admissionCompositeId: string, transcript: string): Promise<void> {
    // Extract original AdmissionID from composite key (which is after last '_')
    const originalAdmissionId = admissionCompositeId.split('_').slice(-1)[0];
    const { error } = await this.supabase
      .from('visits')
      .update({ transcript: transcript })
      .eq('admission_id', originalAdmissionId);
    if (error) {
      console.error('Error updating transcript in DB:', error.message);
      throw error;
    }
    if (this.admissions[admissionCompositeId]) {
      this.admissions[admissionCompositeId].transcript = transcript;
    }
  }

  async createNewAdmission(patientId: string): Promise<Admission> {
    const patientInternalId = Object.values(this.patients).find(p => p.id === patientId)?.id; // This is wrong, need patient table internal id
    if (!this.patients[patientId]) throw new Error(`Patient with original ID ${patientId} not found in local cache.`);
    
    // We need the internal Supabase UUID for the patient_id FK column in visits table
    const { data: patientDBRecord, error: patientFetchError } = await this.supabase
        .from('patients')
        .select('id') // This is the Supabase internal UUID
        .eq('patient_id', patientId) // patientId is the original TSV PatientID
        .single();

    if (patientFetchError || !patientDBRecord) {
        console.error('Failed to fetch patient internal ID from DB:', patientFetchError);
        throw new Error('Could not find patient in database to create new admission.');
    }
    const internalSupabasePatientUUID = patientDBRecord.id;

    const now = new Date();
    const nowIso = now.toISOString();
    const newAdmissionId = `NEW_${crypto.randomUUID()}`; // Ensure it's unique locally and for DB

    const newDbVisit = {
      admission_id: newAdmissionId, // Original ID
      patient_id: internalSupabasePatientUUID, // FK: Supabase internal UUID for the patient
      admission_type: 'consultation',
      started_at: nowIso,
      extra_data: { 
        PatientID: patientId, // Store original patient ID for consistency
        AdmissionID: newAdmissionId,
        AdmissionStart: nowIso,
        AdmissionType: 'consultation',
        ReasonForVisit: 'New Consultation'
      }
    };

    const { data: insertedVisit, error: insertError } = await this.supabase
      .from('visits')
      .insert(newDbVisit)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting new admission to DB:', insertError.message);
      throw insertError;
    }

    const newAdmissionCompositeId = `${patientId}_${newAdmissionId}`; // composite key
    const newAdmission: Admission = {
      id: newAdmissionCompositeId, // composite key
      patientId: patientId, // original patient ID
      scheduledStart: insertedVisit.started_at ? new Date(insertedVisit.started_at).toISOString() : '',
      scheduledEnd: '',
      actualStart: insertedVisit.started_at ? new Date(insertedVisit.started_at).toISOString() : undefined,
      reason: 'New Consultation'
    } as Admission;

    // Update local cache
    this.admissions[newAdmissionCompositeId] = newAdmission;
    if (!this.admissionsByPatient[patientId]) {
      this.admissionsByPatient[patientId] = [];
    }
    this.admissionsByPatient[patientId].push(newAdmissionCompositeId);
    return newAdmission;
  }
}

export const supabaseDataService = new SupabaseDataService(); 