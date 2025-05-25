import { supabaseDataService } from './supabaseDataService';
import { Patient, Admission, Diagnosis, LabResult } from './types';

export interface FHIRPatientContext {
  patient: Patient;
  currentVisit?: Admission;
  priorEncounters: Admission[];
  conditions: Diagnosis[];
  observations: LabResult[];
}

/**
 * PatientContextLoader - Fetches patient data from the FHIR-aligned schema
 * and assembles it into a structured context object for the clinical engine
 */
export class PatientContextLoader {
  /**
   * Fetch complete patient context including demographics, encounters, conditions, and observations
   */
  static async fetch(
    patientId: string,
    currentVisitId?: string,
    includeVisitIds?: string[]
  ): Promise<FHIRPatientContext> {
    // Ensure data is loaded
    const patientData = await supabaseDataService.getPatientData(patientId);
    
    if (!patientData || !patientData.patient) {
      throw new Error(`Patient ${patientId} not found`);
    }

    const patient = patientData.patient;
    const allAdmissions = patientData.admissions || [];
    
    // Find current visit if specified
    let currentVisit: Admission | undefined;
    if (currentVisitId) {
      const currentAdmissionWrapper = allAdmissions.find(
        wrapper => wrapper.admission.id === currentVisitId
      );
      currentVisit = currentAdmissionWrapper?.admission;
    }

    // Filter prior encounters based on includeVisitIds or get all except current
    const priorEncounters = allAdmissions
      .filter(wrapper => {
        if (includeVisitIds && includeVisitIds.length > 0) {
          return includeVisitIds.includes(wrapper.admission.id);
        }
        return wrapper.admission.id !== currentVisitId;
      })
      .map(wrapper => wrapper.admission);

    // Collect all conditions (diagnoses) for the patient
    const conditions = supabaseDataService.getPatientDiagnoses(patientId);

    // Collect all observations (lab results) for the patient
    const observations = supabaseDataService.getPatientLabResults(patientId);

    return {
      patient,
      currentVisit,
      priorEncounters,
      conditions,
      observations
    };
  }

  /**
   * Convert the context to a format suitable for the clinical engine
   */
  static toEngineFormat(context: FHIRPatientContext): Record<string, any> {
    return {
      patient: {
        id: context.patient.id,
        firstName: context.patient.firstName,
        lastName: context.patient.lastName,
        gender: context.patient.gender,
        dateOfBirth: context.patient.dateOfBirth,
        race: context.patient.race,
        ethnicity: context.patient.ethnicity,
        maritalStatus: context.patient.maritalStatus,
        language: context.patient.language,
        primaryDiagnosis: context.patient.primaryDiagnosis,
        diagnosis: context.patient.diagnosis,
        alerts: context.patient.alerts || []
      },
      currentVisit: context.currentVisit ? {
        id: context.currentVisit.id,
        reason: context.currentVisit.reason,
        scheduledStart: context.currentVisit.scheduledStart,
        transcript: context.currentVisit.transcript,
        soapNote: context.currentVisit.soapNote,
        treatments: context.currentVisit.treatments || []
      } : null,
      priorEncounters: context.priorEncounters.map(enc => ({
        id: enc.id,
        reason: enc.reason,
        scheduledStart: enc.scheduledStart,
        transcript: enc.transcript
      })),
      conditions: context.conditions.map(cond => ({
        code: cond.code,
        description: cond.description,
        admissionId: cond.admissionId
      })),
      observations: context.observations.map(obs => ({
        name: obs.name,
        value: obs.value,
        units: obs.units,
        dateTime: obs.dateTime,
        flag: obs.flag,
        referenceRange: obs.referenceRange
      }))
    };
  }
} 