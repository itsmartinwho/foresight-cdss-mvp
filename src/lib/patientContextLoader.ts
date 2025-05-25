import { supabaseDataService } from './supabaseDataService';
import { Patient, Admission, Diagnosis, LabResult } from './types';

export interface FHIRPatientContext {
  patient: Patient;
  currentAdmission?: Admission;
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
    currentAdmissionId?: string,
    includeAdmissionIds?: string[]
  ): Promise<FHIRPatientContext> {
    // Ensure data is loaded
    const patientData = await supabaseDataService.getPatientData(patientId);
    
    if (!patientData || !patientData.patient) {
      throw new Error(`Patient ${patientId} not found`);
    }

    const patient = patientData.patient;
    const allAdmissions = patientData.admissions || [];
    
    // Find current admission if specified
    let currentAdmission: Admission | undefined;
    if (currentAdmissionId) {
      console.log(`PatientContextLoader: Searching for currentAdmissionId: '${currentAdmissionId}'`);
      allAdmissions.forEach((wrapper, index) => {
        console.log(`PatientContextLoader: Admission ${index} has admission_id: '${wrapper.admission.admission_id}', id: '${wrapper.admission.id}'`);
      });
      const currentAdmissionWrapper = allAdmissions.find(
        wrapper => wrapper.admission.admission_id === currentAdmissionId
      );
      currentAdmission = currentAdmissionWrapper?.admission;
    }

    // Filter prior encounters based on includeAdmissionIds or get all except current
    const priorEncounters = allAdmissions
      .filter(wrapper => {
        if (includeAdmissionIds && includeAdmissionIds.length > 0) {
          return includeAdmissionIds.includes(wrapper.admission.id);
        }
        // If currentAdmission is defined, exclude it. Otherwise, include all (as none is current).
        return currentAdmission ? wrapper.admission.id !== currentAdmission.id : true;
      })
      .map(wrapper => wrapper.admission);

    // Collect all conditions (diagnoses) for the patient
    const conditions = supabaseDataService.getPatientDiagnoses(patientId);

    // Collect all observations (lab results) for the patient
    const observations = supabaseDataService.getPatientLabResults(patientId);

    return {
      patient,
      currentAdmission,
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
      currentAdmission: context.currentAdmission ? {
        id: context.currentAdmission.id,
        reason: context.currentAdmission.reason,
        scheduledStart: context.currentAdmission.scheduledStart,
        transcript: context.currentAdmission.transcript,
        soapNote: context.currentAdmission.soapNote,
        treatments: context.currentAdmission.treatments || []
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