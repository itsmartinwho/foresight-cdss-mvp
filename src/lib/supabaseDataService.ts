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
    if (alertsJsonField && typeof alertsJsonField === 'string') {
      try {
        let potentialAlerts = JSON.parse(alertsJsonField);
        if (typeof potentialAlerts === 'string') {
          potentialAlerts = JSON.parse(potentialAlerts);
        }
        if (Array.isArray(potentialAlerts)) {
          return potentialAlerts.filter((al: any) => al && typeof al.id === 'string' && typeof al.msg === 'string');
        }
      } catch (e) {
        console.warn(`Failed to parse alertsJSON for patient ${patientId}:`, e);
      }
    }
    return [];
  }

  private parseTreatments(admissionId: string, treatmentsJsonField: any): Treatment[] | undefined {
    if (treatmentsJsonField && typeof treatmentsJsonField === 'string') {
      try {
        let potentialTreatments = JSON.parse(treatmentsJsonField);
        if (typeof potentialTreatments === 'string') {
          potentialTreatments = JSON.parse(potentialTreatments);
        }
        if (Array.isArray(potentialTreatments)) {
          return potentialTreatments.filter((tr: any) => tr && typeof tr.drug === 'string');
        }
      } catch (e) {
        console.warn(`Failed to parse treatmentsJSON for admission ${admissionId}:`, e);
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
        console.warn(`Skipping visit ${row.admission_id} as its patient ${patientPublicId} was not found in loaded patients.`);
        return;
      }

      // Ensure dates are valid ISO strings or empty strings
      const scheduledStart = ed.ScheduledStartDateTime
        ? new Date(ed.ScheduledStartDateTime).toISOString()
        : row.started_at
        ? new Date(row.started_at).toISOString()
        : '';
      const scheduledEnd = ed.ScheduledEndDateTime
        ? new Date(ed.ScheduledEndDateTime).toISOString()
        : row.discharge_time
        ? new Date(row.discharge_time).toISOString()
        : '';

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
    if (!this.isLoaded) console.warn("getUpcomingConsultations called before data loaded");
    const upcoming: { patient: Patient; visit: Admission }[] = [];
    const now = new Date();

    Object.values(this.admissions).forEach(ad => {
      if (ad.scheduledStart) { // Ensure there IS a scheduledStart string
        try {
          const startDate = new Date(ad.scheduledStart); // Parse the ISO string
          if (startDate instanceof Date && !isNaN(startDate.getTime()) && startDate > now) { // Check if valid date and in future
            const patient = this.patients[ad.patientId];
            if (patient) {
              upcoming.push({ patient, visit: ad });
            }
          }
        } catch (e) {
            // This catch might not be strictly necessary if new Date() doesn't throw for all invalid strings
            // but handles malformed ISO strings that new Date() might error on.
            console.warn(`Invalid date format encountered in getUpcomingConsultations for admission ${ad.id}: ${ad.scheduledStart}`, e)
        }
      }
    });
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