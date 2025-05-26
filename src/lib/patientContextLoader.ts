// import { supabase } from './supabaseClient'; // Assuming supabase client is initialized here
import { supabaseDataService } from './supabaseDataService';
import { Patient, Encounter, Diagnosis, LabResult } from './types'; // Removed FHIRPatientContext and PatientDataPayload
// import { logger } from './logger'; // Removed logger import

// FHIR-like types for conditions and observations
interface FHIRCodeableConcept {
  text?: string;
  coding?: Array<{ display?: string; code?: string; system?: string }>;
}
interface FHIRReference {
  reference?: string;
}
interface FHIRCondition {
  resourceType: "Condition";
  clinicalStatus?: { coding?: Array<{ system?: string; code?: string }> };
  verificationStatus?: { coding?: Array<{ system?: string; code?: string }> };
  category?: Array<{ coding?: Array<{ system?: string; code?: string }> }>;
  code?: FHIRCodeableConcept;
  subject?: FHIRReference;
  encounter?: FHIRReference;
}
interface FHIRObservation {
  resourceType: "Observation";
  status?: string;
  category?: Array<{ coding?: Array<{ system?: string; code?: string }> }>;
  code?: FHIRCodeableConcept;
  subject?: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string };
  valueString?: string;
  flag?: string;
  referenceRange?: string;
}

export interface FHIRPatientContext {
  patient: Patient;
  currentEncounter?: Encounter;
  priorEncounters: Encounter[];
  conditions: FHIRCondition[];  // FHIR-like conditions
  observations: FHIRObservation[];  // FHIR-like observations
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
    // Default empty context
    const defaultContext: FHIRPatientContext = {
      patient: {
        id: '',
        firstName: '',
        lastName: '',
        gender: '',
        dateOfBirth: '',
        race: '',
        ethnicity: '',
        maritalStatus: '',
        language: '',
        alerts: []
      },
      currentEncounter: undefined,
      priorEncounters: [],
      conditions: [],
      observations: []
    };

    // Attempt to get data using the service
    const patientData = await supabaseDataService.getPatientData(patientId);

    if (!patientData || !patientData.patient) {
      // logger.warn(`PatientContextLoader: Patient data not found for ID: ${patientId}`);
      console.warn(`PatientContextLoader: Patient data not found for ID: ${patientId}`); // Reverted to console.warn
      // Consider throwing an error or returning a more specific error state if critical
      return defaultContext; 
    }

    const patient = patientData.patient;
    const allEncounters = patientData.encounters || []; // Renamed from patientData.admissions
    // logger.info(`PatientContextLoader: Found ${allEncounters.length} encounters for patient ${patientId}.`);
    console.log(`PatientContextLoader: Found ${allEncounters.length} encounters for patient ${patientId}.`);

    let currentEncounter: Encounter | undefined = undefined;
    if (currentEncounterId) {
      // The patientData.encounters array from supabaseDataService contains EncounterDetailsWrapper which has an 'encounter' field
      const currentEncounterWrapper = allEncounters.find(
        wrapper => wrapper.encounter.encounterIdentifier === currentEncounterId || wrapper.encounter.id === currentEncounterId
      );
      if (currentEncounterWrapper) {
        currentEncounter = currentEncounterWrapper.encounter;
        defaultContext.currentEncounter = currentEncounter;
        // logger.info(`PatientContextLoader: Successfully matched currentEncounterId '${currentEncounterId}' to encounter with UUID '${currentEncounter.id}'.`);
        console.log(`PatientContextLoader: Successfully matched currentEncounterId '${currentEncounterId}' to encounter with UUID '${currentEncounter.id}'.`);
      } else {
        // logger.warn(`PatientContextLoader: Provided currentEncounterId '${currentEncounterId}' not found for patient ${patientId}.`);
        console.warn(`PatientContextLoader: Provided currentEncounterId '${currentEncounterId}' not found for patient ${patientId}.`);
      }
    }

    // Process prior encounters
    const priorEncounters = allEncounters
      .filter(wrapper => {
        // Filter based on includeEncounterIds if provided
        if (includeEncounterIds && includeEncounterIds.length > 0) {
          return includeEncounterIds.includes(wrapper.encounter.id); // Check against Encounter UUID
        }
        // Default: if currentEncounter is set, exclude it from priors. Otherwise, include all.
        return currentEncounter ? wrapper.encounter.id !== currentEncounter.id : true;
      })
      .map(wrapper => wrapper.encounter); // Extract the Encounter object
    
    defaultContext.priorEncounters = priorEncounters;
    // logger.info(`PatientContextLoader: Processed ${priorEncounters.length} prior encounters.`);
    console.log(`PatientContextLoader: Processed ${priorEncounters.length} prior encounters.`);

    // Process all conditions for the patient from supabaseDataService
    const conditions = supabaseDataService.getPatientDiagnoses(patientId);
    defaultContext.conditions = conditions.map(cond => ({
      resourceType: "Condition",
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] }, 
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-verification", code: "confirmed" }] }, 
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis" }] }], 
      code: { text: cond.description || "Unknown Condition", coding: [{ display: cond.description, code: cond.code }] },
      subject: { reference: `Patient/${patientId}` },
      encounter: cond.encounterId ? { reference: `Encounter/${cond.encounterId}` } : undefined, 
    }));
    // logger.info(`PatientContextLoader: Loaded ${context.conditions.length} conditions.`);
    console.log(`PatientContextLoader: Loaded ${defaultContext.conditions.length} conditions.`);

    // Process all lab results for the patient from supabaseDataService
    const labResults = supabaseDataService.getPatientLabResults(patientId);
    defaultContext.observations = labResults.map(lab => ({
      resourceType: "Observation",
      status: "final", 
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
      code: { text: lab.name || "Unknown Lab Test" },
      subject: { reference: `Patient/${patientId}` },
      encounter: lab.encounterId ? { reference: `Encounter/${lab.encounterId}` } : undefined, 
      effectiveDateTime: lab.dateTime,
      valueQuantity: typeof lab.value === 'number' ? { value: lab.value, unit: lab.units } : undefined,
      valueString: typeof lab.value === 'string' ? lab.value : undefined,
      flag: lab.flag,
      referenceRange: lab.referenceRange
    }));
    // logger.info(`PatientContextLoader: Loaded ${context.labResults.length} lab results.`);
    console.log(`PatientContextLoader: Loaded ${defaultContext.observations.length} lab results.`);
    
    // logger.info(`PatientContextLoader: Context built successfully for patient ${patientId}. Current Encounter ID (if any): ${currentEncounter?.id}`);
    console.log(`PatientContextLoader: Context built successfully for patient ${patientId}. Current Encounter ID (if any): ${currentEncounter?.id}`);
    return defaultContext;
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
        code: cond.code?.coding?.[0]?.code || '',
        description: cond.code?.text || cond.code?.coding?.[0]?.display || '',
        encounterId: cond.encounter?.reference?.split('/')[1] || ''
      })),
      observations: context.observations.map(obs => ({
        name: obs.code?.text || '',
        value: obs.valueQuantity?.value ?? obs.valueString ?? '',
        units: obs.valueQuantity?.unit,
        dateTime: obs.effectiveDateTime,
        flag: obs.flag,
        referenceRange: obs.referenceRange
      }))
    };
  }
} 