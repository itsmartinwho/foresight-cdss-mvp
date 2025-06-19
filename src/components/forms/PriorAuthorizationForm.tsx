'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Warning, CheckCircle } from '@phosphor-icons/react';
import FHIRResourceSelector from '@/components/ui/FHIRResourceSelector';
import { EditableTextField } from '@/components/ui/editable';
import { PriorAuthService, PRIOR_AUTH_RESOURCE_TYPES } from '@/lib/forms/priorAuthService';
import { Patient, Encounter, Diagnosis, PriorAuthFormData, FormValidationResult } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface PriorAuthorizationFormProps {
  patient: Patient;
  encounter: Encounter;
  diagnoses: Diagnosis[];
  onSave: (data: PriorAuthFormData) => Promise<void>;
  onGeneratePDF: (data: PriorAuthFormData) => Promise<void>;
}

export default function PriorAuthorizationForm({
  patient,
  encounter,
  diagnoses,
  onSave,
  onGeneratePDF
}: PriorAuthorizationFormProps) {
  const [formData, setFormData] = useState<PriorAuthFormData>(() =>
    PriorAuthService.autoPopulateForm(patient, encounter, diagnoses)
  );
  const [validation, setValidation] = useState<FormValidationResult>({ 
    isValid: true, 
    errors: {}, 
    warnings: {} 
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Auto-populate when resource type changes
  useEffect(() => {
    const newFormData = PriorAuthService.autoPopulateForm(patient, encounter, diagnoses, formData.resourceType);
    // Only update fields that are currently empty to avoid overriding user input
    setFormData(prev => ({
      ...prev,
      resourceType: formData.resourceType, // Always update resource type
      // Only populate patient info if it's currently empty
      patientInformation: {
        name: prev.patientInformation.name || newFormData.patientInformation.name,
        dateOfBirth: prev.patientInformation.dateOfBirth || newFormData.patientInformation.dateOfBirth,
        gender: prev.patientInformation.gender || newFormData.patientInformation.gender,
        insuranceId: prev.patientInformation.insuranceId || newFormData.patientInformation.insuranceId,
        memberId: prev.patientInformation.memberId || newFormData.patientInformation.memberId,
      },
      // Provider info is typically left as manual input
      providerInformation: prev.providerInformation,
      // Only populate service request if diagnosis/service are currently empty
      serviceRequest: {
        diagnosis: prev.serviceRequest.diagnosis || newFormData.serviceRequest.diagnosis,
        diagnosisCode: prev.serviceRequest.diagnosisCode || newFormData.serviceRequest.diagnosisCode,
        requestedService: prev.serviceRequest.requestedService || newFormData.serviceRequest.requestedService,
        serviceCode: prev.serviceRequest.serviceCode || newFormData.serviceRequest.serviceCode,
        startDate: prev.serviceRequest.startDate || newFormData.serviceRequest.startDate,
        duration: prev.serviceRequest.duration || newFormData.serviceRequest.duration,
        frequency: prev.serviceRequest.frequency || newFormData.serviceRequest.frequency,
      },
      // Only populate clinical justification if empty
      clinicalJustification: prev.clinicalJustification || newFormData.clinicalJustification,
      authorizationNumber: prev.authorizationNumber || newFormData.authorizationNumber,
      urgencyLevel: prev.urgencyLevel || newFormData.urgencyLevel,
      supportingDocumentation: prev.supportingDocumentation || newFormData.supportingDocumentation,
    }));
  }, [formData.resourceType, patient, encounter, diagnoses]);

  // Validate form on data changes
  useEffect(() => {
    const validationResult = PriorAuthService.validateForm(formData);
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
        description: "Prior authorization form has been downloaded",
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

  const getFieldError = (fieldName: string) => validation.errors[fieldName];
  const getFieldWarning = (fieldName: string) => validation.warnings[fieldName];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center justify-between">
          Prior Authorization
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
          resourceTypes={PRIOR_AUTH_RESOURCE_TYPES}
          placeholder="Select authorization type"
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
              <label className="block text-sm font-medium text-muted-foreground mb-1">Insurance ID</label>
              <Input
                value={formData.patientInformation.insuranceId}
                onChange={(e) => updateField('patientInformation.insuranceId', e.target.value)}
                placeholder="Enter insurance ID"
              />
            </div>
          </div>
        </div>

        {/* Provider Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Provider Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Provider Name
                {getFieldWarning('providerName') && (
                  <span className="text-yellow-600 ml-1">⚠</span>
                )}
              </label>
              <Input
                value={formData.providerInformation.name}
                onChange={(e) => updateField('providerInformation.name', e.target.value)}
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
                value={formData.providerInformation.npi}
                onChange={(e) => updateField('providerInformation.npi', e.target.value)}
                placeholder="Enter NPI number"
              />
              {getFieldWarning('providerNPI') && (
                <p className="text-xs text-yellow-600 mt-1">{getFieldWarning('providerNPI')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Facility</label>
              <Input
                value={formData.providerInformation.facility}
                onChange={(e) => updateField('providerInformation.facility', e.target.value)}
                placeholder="Enter facility name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Phone</label>
              <Input
                value={formData.providerInformation.contactPhone}
                onChange={(e) => updateField('providerInformation.contactPhone', e.target.value)}
                placeholder="Enter contact phone"
              />
            </div>
          </div>
        </div>

        {/* Service Request */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Service Request</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Diagnosis *
              </label>
                             <EditableTextField
                 value={formData.serviceRequest.diagnosis}
                 onSave={async (value) => updateField('serviceRequest.diagnosis', value)}
                 placeholder="Enter diagnosis"
                 displayClassName={getFieldError('diagnosis') ? "text-destructive" : "text-sm"}
               />
              {getFieldError('diagnosis') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('diagnosis')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">ICD-10 Code</label>
              <Input
                value={formData.serviceRequest.diagnosisCode}
                onChange={(e) => updateField('serviceRequest.diagnosisCode', e.target.value)}
                placeholder="Enter ICD-10 code"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Requested Service/Medication *
              </label>
                             <EditableTextField
                 value={formData.serviceRequest.requestedService}
                 onSave={async (value) => updateField('serviceRequest.requestedService', value)}
                 placeholder="Enter requested service or medication"
                 displayClassName={getFieldError('requestedService') ? "text-destructive" : "text-sm"}
               />
              {getFieldError('requestedService') && (
                <p className="text-xs text-destructive mt-1">{getFieldError('requestedService')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Service Code
                {getFieldWarning('serviceCode') && (
                  <span className="text-yellow-600 ml-1">⚠</span>
                )}
              </label>
              <Input
                value={formData.serviceRequest.serviceCode}
                onChange={(e) => updateField('serviceRequest.serviceCode', e.target.value)}
                placeholder="Enter service code"
              />
              {getFieldWarning('serviceCode') && (
                <p className="text-xs text-yellow-600 mt-1">{getFieldWarning('serviceCode')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Urgency Level</label>
              <Select
                value={formData.urgencyLevel}
                onValueChange={(value) => updateField('urgencyLevel', value)}
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

        {/* Clinical Justification */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Clinical Justification *
          </label>
                     <EditableTextField
             value={formData.clinicalJustification}
             onSave={async (value) => updateField('clinicalJustification', value)}
             placeholder="Enter clinical justification for prior authorization..."
             multiline
             displayClassName={getFieldError('clinicalJustification') ? "text-destructive" : "text-sm"}
           />
          {getFieldError('clinicalJustification') && (
            <p className="text-xs text-destructive">{getFieldError('clinicalJustification')}</p>
          )}
        </div>

        {/* Authorization Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Authorization Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Authorization Number</label>
              <Input
                value={formData.authorizationNumber}
                onChange={(e) => updateField('authorizationNumber', e.target.value)}
                placeholder="Enter authorization number (if available)"
              />
            </div>
          </div>
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