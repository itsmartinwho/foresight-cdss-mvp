import { supabaseDataService } from './supabaseDataService';
import { Patient, Encounter, Diagnosis, LabResult } from './types';

export interface FHIRPatientContext {
  patient: Patient;
  currentEncounter?: Encounter;
  priorEncounters: Encounter[];
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
    currentEncounterId?: string,
    includeEncounterIds?: string[]
  ): Promise<FHIRPatientContext> {
    // Ensure data is loaded
    const patientData = await supabaseDataService.getPatientData(patientId);
    
    if (!patientData || !patientData.patient) {
      throw new Error(`Patient ${patientId} not found`);
    }

    const patient = patientData.patient;
    const allAdmissions = patientData.admissions || [];
    
    // Find current encounter if specified
    let currentEncounter: Encounter | undefined;
    if (currentEncounterId) {
      console.log(`PatientContextLoader: Searching for currentEncounterId: '${currentEncounterId}'`);
      allAdmissions.forEach((wrapper, index) => {
        console.log(`PatientContextLoader: Encounter ${index} has encounterIdentifier: '${wrapper.admission.encounterIdentifier}', id: '${wrapper.admission.id}'`);
      });
      const currentEncounterWrapper = allAdmissions.find(
        wrapper => wrapper.admission.encounterIdentifier === currentEncounterId
      );
      currentEncounter = currentEncounterWrapper?.admission;
    }

    // Filter prior encounters based on includeEncounterIds or get all except current
    const priorEncounters = allAdmissions
      .filter(wrapper => {
        if (includeEncounterIds && includeEncounterIds.length > 0) {
          return includeEncounterIds.includes(wrapper.admission.id);
        }
        // If currentEncounter is defined, exclude it. Otherwise, include all (as none is current).
        return currentEncounter ? wrapper.admission.id !== currentEncounter.id : true;
      })
      .map(wrapper => wrapper.admission);

    // Collect all conditions (diagnoses) for the patient
    const conditions = supabaseDataService.getPatientDiagnoses(patientId);

    // Collect all observations (lab results) for the patient
    const observations = supabaseDataService.getPatientLabResults(patientId);

    return {
      patient,
      currentEncounter,
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
      currentEncounter: context.currentEncounter ? {
        id: context.currentEncounter.id,
        reason: context.currentEncounter.reasonCode,
        scheduledStart: context.currentEncounter.scheduledStart,
        transcript: context.currentEncounter.transcript,
        soapNote: context.currentEncounter.soapNote,
        treatments: context.currentEncounter.treatments || []
      } : null,
      priorEncounters: context.priorEncounters.map(enc => ({
        id: enc.id,
        reason: enc.reasonCode,
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