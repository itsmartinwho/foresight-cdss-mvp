'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Warning, CheckCircle, Plus, X } from '@phosphor-icons/react';
import FHIRResourceSelector from '@/components/ui/FHIRResourceSelector';
import { EditableTextField } from '@/components/ui/editable';
import { ReferralService, REFERRAL_RESOURCE_TYPES, SPECIALTY_TYPES } from '@/lib/forms/referralService';
import { Patient, Encounter, Diagnosis, LabResult, ReferralFormData, FormValidationResult } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface ReferralFormProps {
  patient: Patient;
  encounter: Encounter;
  diagnoses: Diagnosis[];
  labResults?: LabResult[];
  onSave: (data: ReferralFormData) => Promise<void>;
  onGeneratePDF: (data: ReferralFormData) => Promise<void>;
}

export default function ReferralForm({
  patient,
  encounter,
  diagnoses,
  labResults = [],
  onSave,
  onGeneratePDF
}: ReferralFormProps) {
  // Defensive null checks to prevent React errors
  if (!patient || !encounter) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Unable to load form data. Patient or encounter information is missing.</p>
      </div>
    );
  }

  const [formData, setFormData] = useState<ReferralFormData>(() =>
    ReferralService.autoPopulateForm(patient, encounter, diagnoses || [], labResults)
  );
  const [validation, setValidation] = useState<FormValidationResult>({ 
    isValid: true, 
    errors: {}, 
    warnings: {} 
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Auto-populate when resource type changes
  useEffect(() => {
    const newFormData = ReferralService.autoPopulateForm(patient, encounter, diagnoses, labResults, formData.resourceType);
    // Only update fields that are currently empty to avoid overriding user input
    setFormData(prev => ({
      ...prev,
      resourceType: formData.resourceType, // Always update resource type
      // Only populate patient info if it's currently empty
      patientInformation: {
        name: prev.patientInformation.name || newFormData.patientInformation.name,
        dateOfBirth: prev.patientInformation.dateOfBirth || newFormData.patientInformation.dateOfBirth,
        gender: prev.patientInformation.gender || newFormData.patientInformation.gender,
        contactPhone: prev.patientInformation.contactPhone || newFormData.patientInformation.contactPhone,
        insurance: prev.patientInformation.insurance || newFormData.patientInformation.insurance,
        address: prev.patientInformation.address || newFormData.patientInformation.address,
      },
      // Provider info is typically left as manual input
      referringProvider: prev.referringProvider,
      // Update specialist suggestion only if type is currently empty
      specialist: {
        type: prev.specialist.type || newFormData.specialist.type,
        facility: prev.specialist.facility || newFormData.specialist.facility,
        preferredProvider: prev.specialist.preferredProvider || newFormData.specialist.preferredProvider,
      },
      // Only populate referral reason if diagnosis/reason are currently empty
      referralReason: {
        diagnosis: prev.referralReason.diagnosis || newFormData.referralReason.diagnosis,
        diagnosisCode: prev.referralReason.diagnosisCode || newFormData.referralReason.diagnosisCode,
        reasonForReferral: prev.referralReason.reasonForReferral || newFormData.referralReason.reasonForReferral,
        urgency: prev.referralReason.urgency || newFormData.referralReason.urgency,
      },
      // Only populate clinical information if currently empty
      clinicalInformation: {
        historyOfPresentIllness: prev.clinicalInformation.historyOfPresentIllness || newFormData.clinicalInformation.historyOfPresentIllness,
        relevantPastMedicalHistory: prev.clinicalInformation.relevantPastMedicalHistory.length > 0 
          ? prev.clinicalInformation.relevantPastMedicalHistory 
          : newFormData.clinicalInformation.relevantPastMedicalHistory,
        currentMedications: prev.clinicalInformation.currentMedications.length > 0 
          ? prev.clinicalInformation.currentMedications 
          : newFormData.clinicalInformation.currentMedications,
        allergies: prev.clinicalInformation.allergies.length > 0 
          ? prev.clinicalInformation.allergies 
          : newFormData.clinicalInformation.allergies,
        physicalExamination: prev.clinicalInformation.physicalExamination || newFormData.clinicalInformation.physicalExamination,
        recentLabResults: prev.clinicalInformation.recentLabResults.length > 0 
          ? prev.clinicalInformation.recentLabResults 
          : newFormData.clinicalInformation.recentLabResults,
        vitalSigns: prev.clinicalInformation.vitalSigns || newFormData.clinicalInformation.vitalSigns,
      },
      requestedEvaluation: prev.requestedEvaluation.length > 0 
        ? prev.requestedEvaluation 
        : newFormData.requestedEvaluation,
      additionalNotes: prev.additionalNotes || newFormData.additionalNotes,
    }));
  }, [formData.resourceType, patient, encounter, diagnoses, labResults]);

  // Validate form on data changes
  useEffect(() => {
    const validationResult = ReferralService.validateForm(formData);
    setValidation(validationResult);
  }, [formData]);

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Show toast when resource type changes
      if (path === 'resourceType') {
        const resourceTypeLabel = REFERRAL_RESOURCE_TYPES.find(r => r.value === value)?.label;
        toast({
          title: "Referral Type Updated", 
          description: `Form updated for ${resourceTypeLabel}`,
          variant: "default"
        });
      }
      
      return newData;
    });

    // Auto-save after a brief delay
    setTimeout(async () => {
      await onSave(formData);
    }, 500);
  };

  const handleGeneratePDF = async () => {
    if (!validation.isValid) {
      toast({
        title: "Form Validation Failed",
        description: "Please fix the errors before generating PDF",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPDF(true);
    try {
      await onGeneratePDF(formData);
      toast({
        title: "PDF Generated Successfully",
        description: "Referral form has been downloaded",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "PDF Generation Failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const addRequestedEvaluation = () => {
    const updatedEvaluations = [...formData.requestedEvaluation, ''];
    updateField('requestedEvaluation', updatedEvaluations);
  };

  const removeRequestedEvaluation = (index: number) => {
    const updatedEvaluations = formData.requestedEvaluation.filter((_, i) => i !== index);
    updateField('requestedEvaluation', updatedEvaluations);
  };

  const updateRequestedEvaluation = (index: number, value: string) => {
    const updatedEvaluations = [...formData.requestedEvaluation];
    updatedEvaluations[index] = value;
    updateField('requestedEvaluation', updatedEvaluations);
  };

  const getFieldError = (fieldName: string) => validation.errors[fieldName];
  const getFieldWarning = (fieldName: string) => validation.warnings[fieldName];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center justify-between">
          Referral
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Warning className="h-5 w-5 text-yellow-500" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={!validation.isValid || isGeneratingPDF}
              className="flex items-center gap-2"
            >
              {isGeneratingPDF ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Generate PDF
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FHIR Resource Type Selector */}
        <FHIRResourceSelector
          value={formData.resourceType}
          onValueChange={(value) => updateField('resourceType', value)}
          resourceTypes={REFERRAL_RESOURCE_TYPES}
          placeholder="Select referral type"
        />

        {/* Patient Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Patient Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Patient Name *
              </label>
              <EditableTextField
                value={formData.patientInformation.name}
                onSave={async (value) => updateField('patientInformation.name', value)}
                placeholder="Enter patient name"
                displayClassName={getFieldError('patientName') ? "text-destructive" : "text-sm"}
              />
              {getFieldError('patientName') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('patientName')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Date of Birth *
              </label>
              <Input
                type="date"
                value={formData.patientInformation.dateOfBirth}
                onChange={(e) => updateField('patientInformation.dateOfBirth', e.target.value)}
                className={getFieldError('dateOfBirth') ? "border-destructive" : ""}
              />
              {getFieldError('dateOfBirth') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('dateOfBirth')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Gender</label>
              <Input
                value={formData.patientInformation.gender}
                onChange={(e) => updateField('patientInformation.gender', e.target.value)}
                placeholder="Enter gender"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Phone</label>
              <Input
                value={formData.patientInformation.contactPhone}
                onChange={(e) => updateField('patientInformation.contactPhone', e.target.value)}
                placeholder="Enter contact phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Insurance</label>
              <Input
                value={formData.patientInformation.insurance}
                onChange={(e) => updateField('patientInformation.insurance', e.target.value)}
                placeholder="Enter insurance information"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
              <Input
                value={formData.patientInformation.address}
                onChange={(e) => updateField('patientInformation.address', e.target.value)}
                placeholder="Enter patient address"
              />
            </div>
          </div>
        </div>

        {/* Referring Provider Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Referring Provider Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Provider Name
                {getFieldWarning('providerName') && (
                  <span className="text-yellow-600 ml-1">⚠</span>
                )}
              </label>
              <Input
                value={formData.referringProvider.name}
                onChange={(e) => updateField('referringProvider.name', e.target.value)}
                placeholder="Enter provider name"
              />
              {getFieldWarning('providerName') && (
                <p className="text-xs text-yellow-600 mt-1">{getFieldWarning('providerName')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                NPI Number
                {getFieldWarning('providerNPI') && (
                  <span className="text-yellow-600 ml-1">⚠</span>
                )}
              </label>
              <Input
                value={formData.referringProvider.npi}
                onChange={(e) => updateField('referringProvider.npi', e.target.value)}
                placeholder="Enter NPI number"
              />
              {getFieldWarning('providerNPI') && (
                <p className="text-xs text-yellow-600 mt-1">{getFieldWarning('providerNPI')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Facility</label>
              <Input
                value={formData.referringProvider.facility}
                onChange={(e) => updateField('referringProvider.facility', e.target.value)}
                placeholder="Enter facility name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Phone</label>
              <Input
                value={formData.referringProvider.contactPhone}
                onChange={(e) => updateField('referringProvider.contactPhone', e.target.value)}
                placeholder="Enter contact phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Email</label>
              <Input
                value={formData.referringProvider.contactEmail}
                onChange={(e) => updateField('referringProvider.contactEmail', e.target.value)}
                placeholder="Enter contact email"
              />
            </div>
          </div>
        </div>

        {/* Specialist Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Specialist Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Specialty Type *
              </label>
              <Select
                value={formData.specialist.type}
                onValueChange={(value) => updateField('specialist.type', value)}
              >
                <SelectTrigger className={getFieldError('specialtyType') ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTY_TYPES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFieldError('specialtyType') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('specialtyType')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Preferred Facility
                {getFieldWarning('specialistFacility') && (
                  <span className="text-yellow-600 ml-1">⚠</span>
                )}
              </label>
              <Input
                value={formData.specialist.facility}
                onChange={(e) => updateField('specialist.facility', e.target.value)}
                placeholder="Enter preferred facility"
              />
              {getFieldWarning('specialistFacility') && (
                <p className="text-xs text-yellow-600 mt-1">{getFieldWarning('specialistFacility')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Preferred Provider</label>
              <Input
                value={formData.specialist.preferredProvider}
                onChange={(e) => updateField('specialist.preferredProvider', e.target.value)}
                placeholder="Enter preferred provider name"
              />
            </div>
          </div>
        </div>

        {/* Referral Reason */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Referral Reason</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Primary Diagnosis *
              </label>
              <EditableTextField
                value={formData.referralReason.diagnosis}
                onSave={async (value) => updateField('referralReason.diagnosis', value)}
                placeholder="Enter primary diagnosis"
                displayClassName={getFieldError('diagnosis') ? "text-destructive" : "text-sm"}
              />
              {getFieldError('diagnosis') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('diagnosis')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">ICD-10 Code</label>
              <Input
                value={formData.referralReason.diagnosisCode}
                onChange={(e) => updateField('referralReason.diagnosisCode', e.target.value)}
                placeholder="Enter ICD-10 code"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Reason for Referral *
              </label>
              <EditableTextField
                value={formData.referralReason.reasonForReferral}
                onSave={async (value) => updateField('referralReason.reasonForReferral', value)}
                placeholder="Enter detailed reason for referral..."
                multiline
                displayClassName={getFieldError('reasonForReferral') ? "text-destructive" : "text-sm"}
              />
              {getFieldError('reasonForReferral') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('reasonForReferral')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Urgency Level</label>
              <Select
                value={formData.referralReason.urgency}
                onValueChange={(value) => updateField('referralReason.urgency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Clinical Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Clinical Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              History of Present Illness
              {getFieldWarning('clinicalHistory') && (
                <span className="text-yellow-600 ml-1">⚠</span>
              )}
            </label>
            <EditableTextField
              value={formData.clinicalInformation.historyOfPresentIllness}
              onSave={async (value) => updateField('clinicalInformation.historyOfPresentIllness', value)}
              placeholder="Enter history of present illness..."
              multiline
              displayClassName="text-sm"
            />
            {getFieldWarning('clinicalHistory') && (
              <p className="text-xs text-yellow-600 mt-1">{getFieldWarning('clinicalHistory')}</p>
            )}
          </div>

          {/* Current Medications */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Current Medications</label>
            <div className="flex flex-wrap gap-2 min-h-8">
              {formData.clinicalInformation.currentMedications.map((medication, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {medication}
                </Badge>
              ))}
              {formData.clinicalInformation.currentMedications.length === 0 && (
                <span className="text-sm text-muted-foreground italic">No current medications</span>
              )}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Allergies</label>
            <div className="flex flex-wrap gap-2 min-h-8">
              {formData.clinicalInformation.allergies.map((allergy, index) => (
                <Badge key={index} variant="destructive" className="text-xs">
                  {allergy}
                </Badge>
              ))}
              {formData.clinicalInformation.allergies.length === 0 && (
                <span className="text-sm text-muted-foreground italic">No known allergies</span>
              )}
            </div>
          </div>
        </div>

        {/* Requested Evaluation */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Requested Evaluation</h3>
          <div className="space-y-2">
            {formData.requestedEvaluation.map((evaluation, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={evaluation}
                  onChange={(e) => updateRequestedEvaluation(index, e.target.value)}
                  placeholder="Enter requested evaluation"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeRequestedEvaluation(index)}
                  className="p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addRequestedEvaluation}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Evaluation
            </Button>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">Additional Notes</label>
          <EditableTextField
            value={formData.additionalNotes}
            onSave={async (value) => updateField('additionalNotes', value)}
            placeholder="Enter any additional notes for the specialist..."
            multiline
            displayClassName="text-sm"
          />
        </div>

        {/* Validation Summary */}
        {(!validation.isValid || Object.keys(validation.warnings).length > 0) && (
          <div className="space-y-2">
            {!validation.isValid && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm font-medium text-destructive mb-1">Required fields missing:</p>
                <ul className="text-xs text-destructive/80 list-disc list-inside">
                  {Object.values(validation.errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {Object.keys(validation.warnings).length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-sm font-medium text-yellow-700 mb-1">Recommended fields:</p>
                <ul className="text-xs text-yellow-600 list-disc list-inside">
                  {Object.values(validation.warnings).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 