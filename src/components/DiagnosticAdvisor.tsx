'use client';

import React, { useState, useEffect } from 'react';
import { DiagnosticPlan, DiagnosticStep, DiagnosticResult, ClinicalTrial } from '@/lib/types';
import { clinicalEngineService } from '@/lib/clinicalEngineService';

interface DiagnosticAdvisorProps {
  patientId?: string;
  symptoms?: string[];
}

export default function DiagnosticAdvisor({ patientId, symptoms: initialSymptoms }: DiagnosticAdvisorProps) {
  const [symptoms, setSymptoms] = useState<string[]>(initialSymptoms || []);
  const [symptomInput, setSymptomInput] = useState<string>('');
  const [diagnosticPlan, setDiagnosticPlan] = useState<DiagnosticPlan | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [clinicalTrials, setClinicalTrials] = useState<ClinicalTrial[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [planExecuting, setPlanExecuting] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('plan');

  useEffect(() => {
    if (initialSymptoms && initialSymptoms.length > 0) {
      setSymptoms(initialSymptoms);
    }
  }, [initialSymptoms]);

  const handleAddSymptom = () => {
    if (symptomInput.trim() === '') return;
    
    if (!symptoms.includes(symptomInput.trim())) {
      setSymptoms([...symptoms, symptomInput.trim()]);
    }
    
    setSymptomInput('');
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  const handleGeneratePlan = async () => {
    if (symptoms.length === 0) {
      setError('Please add at least one symptom');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const plan = await clinicalEngineService.generateDiagnosticPlan(symptoms, patientId);
      setDiagnosticPlan(plan);
      setDiagnosticResult(null);
      setClinicalTrials([]);
      setCurrentStep(0);
      setActiveTab('plan');
    } catch (err) {
      console.error('Error generating diagnostic plan:', err);
      setError('Failed to generate diagnostic plan');
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePlan = async () => {
    if (!diagnosticPlan) return;
    
    setError(null);
    setPlanExecuting(true);
    setCurrentStep(0);
    
    try {
      // Reset the plan steps to their initial state
      const resetPlan: DiagnosticPlan = {
        ...diagnosticPlan,
        steps: diagnosticPlan.steps.map(step => ({
          ...step,
          completed: false,
          findings: '',
          sources: []
        }))
      };
      
      setDiagnosticPlan(resetPlan);
      
      // Execute the plan with a callback to update progress
      const updatedPlan = await clinicalEngineService.executeDiagnosticPlan(
        resetPlan,
        patientId,
        (plan) => {
          setDiagnosticPlan(plan);
          setCurrentStep(plan.steps.filter(step => step.completed).length);
        }
      );
      
      setDiagnosticPlan(updatedPlan);
      
      // Generate diagnostic result
      const result = await clinicalEngineService.generateDiagnosticResult(symptoms, updatedPlan);
      setDiagnosticResult(result);
      
      // Match clinical trials if a diagnosis is available
      if (result.diagnosisName) {
        const trials = await clinicalEngineService.matchClinicalTrials(result.diagnosisName, patientId);
        setClinicalTrials(trials);
      }
      
      setActiveTab('result');
    } catch (err) {
      console.error('Error executing diagnostic plan:', err);
      setError('Failed to execute diagnostic plan');
    } finally {
      setPlanExecuting(false);
    }
  };

  const handleGeneratePriorAuth = async () => {
    if (!diagnosticResult || !patientId) return;
    
    try {
      // In a real application, this would open a modal or navigate to a form
      // For the MVP, we'll just log to console
      console.log('Generating prior authorization for:', diagnosticResult.diagnosisName);
      
      if (diagnosticResult.recommendedTreatments.length > 0) {
        const priorAuth = await clinicalEngineService.generatePriorAuthorization(
          diagnosticResult.diagnosisName,
          diagnosticResult.recommendedTreatments[0],
          patientId
        );
        
        console.log('Prior authorization generated:', priorAuth);
        alert('Prior authorization generated successfully. Check console for details.');
      }
    } catch (err) {
      console.error('Error generating prior authorization:', err);
      alert('Failed to generate prior authorization');
    }
  };

  const handleGenerateReferral = async () => {
    if (!diagnosticResult || !patientId) return;
    
    try {
      // In a real application, this would open a modal or navigate to a form
      // For the MVP, we'll just log to console
      console.log('Generating specialist referral for:', diagnosticResult.diagnosisName);
      
      let specialistType = 'General';
      
      if (diagnosticResult.diagnosisName.includes('Rheumatoid Arthritis')) {
        specialistType = 'Rheumatology';
      } else if (diagnosticResult.diagnosisName.includes('Leukemia')) {
        specialistType = 'Hematology-Oncology';
      }
      
      const referral = await clinicalEngineService.generateSpecialistReferral(
        diagnosticResult.diagnosisName,
        specialistType,
        patientId
      );
      
      console.log('Specialist referral generated:', referral);
      alert('Specialist referral generated successfully. Check console for details.');
    } catch (err) {
      console.error('Error generating specialist referral:', err);
      alert('Failed to generate specialist referral');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">AI Diagnostic & Treatment Advisor</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter symptoms to generate a diagnostic plan and treatment recommendations
        </p>
      </div>

      <div className="p-6">
        {/* Symptom input */}
        <div className="mb-6">
          <label htmlFor="symptom" className="block text-sm font-medium text-gray-700 mb-1">
            Add Symptoms
          </label>
          <div className="flex">
            <input
              type="text"
              id="symptom"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a symptom"
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymptom()}
            />
            <button
              type="button"
              onClick={handleAddSymptom}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
          
          {/* Symptom tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {symptoms.map((symptom, index) => (
              <div
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {symptom}
                <button
                  type="button"
                  onClick={() => handleRemoveSymptom(symptom)}
                  className="ml-2 inline-flex text-blue-400 hover:text-blue-600 focus:outline-none"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
          
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={loading || symptoms.length === 0}
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                loading || symptoms.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Generating...' : 'Generate Diagnostic Plan'}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        {diagnosticPlan && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px">
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'plan'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('plan')}
              >
                Diagnostic Plan
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'result'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('result')}
                disabled={!diagnosticResult}
              >
                Diagnostic Result
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'trials'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('trials')}
                disabled={clinicalTrials.length === 0}
              >
                Clinical Trials
              </button>
            </nav>
          </div>
        )}
        
        {/* Tab content */}
        {diagnosticPlan && activeTab === 'plan' && (
          <div>
            <div className="mb-4 bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Diagnostic Approach</h3>
              <p className="text-sm text-gray-600">{diagnosticPlan.rationale}</p>
            </div>
            
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Diagnostic Steps</h3>
              <button
                type="button"
                onClick={handleExecutePlan}
                disabled={planExecuting}
                className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  planExecuting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
              >
                {planExecuting ? `Executing (${currentStep}/${diagnosticPlan.steps.length})` : 'Execute Plan'}
              </button>
            </div>
            
            <div className="space-y-4">
              {diagnosticPlan.steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`border rounded-md overflow-hidden ${
                    step.completed 
                      ? 'border-green-300' 
                      : index === currentStep && planExecuting
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center p-4">
                    <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                      step.completed 
                        ? 'bg-green-100 text-green-600' 
                        : index === currentStep && planExecuting
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {step.completed ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="ml-4 flex-grow">
                      <h4 className="text-sm font-medium text-gray-900">{step.description}</h4>
                      <p className="text-xs text-gray-500">{step.query}</p>
                    </div>
                    {step.completed && (
                      <div className="ml-4 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const detailsEl = document.getElementById(`step-details-${step.id}`);
                            if (detailsEl) {
                              detailsEl.classList.toggle('hidden');
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {step.completed && (
                    <div id={`step-details-${step.id}`} className="hidden border-t border-gray-200 p-4 bg-gray-50">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Findings</h5>
                      <div className="text-sm text-gray-600 whitespace-pre-line">
                        {step.findings}
                      </div>
                      
                      {step.sources.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Sources</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {step.sources.map((source, sourceIndex) => (
                              <li key={sourceIndex}>
                                <span className="font-medium">{source.title}</span>
                                {source.type === 'guideline' && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Guideline
                                  </span>
                                )}
                                {source.type === 'patient_data' && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Patient Data
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {diagnosticResult && activeTab === 'result' && (
          <div>
            <div className="mb-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Primary Diagnosis</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Confidence:</span>
                    <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          diagnosticResult.confidence >= 0.8 
                            ? 'bg-green-500' 
                            : diagnosticResult.confidence >= 0.6
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${diagnosticResult.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {Math.round(diagnosticResult.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center">
                  <h4 className="text-xl font-semibold text-gray-900">{diagnosticResult.diagnosisName}</h4>
                  {diagnosticResult.diagnosisCode && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {diagnosticResult.diagnosisCode}
                    </span>
                  )}
                </div>
                
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Supporting Evidence</h5>
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    {diagnosticResult.supportingEvidence.map((evidence, index) => (
                      <li key={index}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-900">Differential Diagnoses</h3>
                </div>
                <div className="p-4">
                  {diagnosticResult.differentialDiagnoses.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {diagnosticResult.differentialDiagnoses.map((diagnosis, index) => (
                        <li key={index} className="py-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">{diagnosis.name}</h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              diagnosis.likelihood === 'High' 
                                ? 'bg-red-100 text-red-800' 
                                : diagnosis.likelihood === 'Moderate'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}>
                              {diagnosis.likelihood}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{diagnosis.keyFactors}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No differential diagnoses available</p>
                  )}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-900">Recommended Tests</h3>
                </div>
                <div className="p-4">
                  {diagnosticResult.recommendedTests.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      {diagnosticResult.recommendedTests.map((test, index) => (
                        <li key={index}>{test}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No recommended tests available</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900">Recommended Treatments</h3>
              </div>
              <div className="p-4">
                {diagnosticResult.recommendedTreatments.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    {diagnosticResult.recommendedTreatments.map((treatment, index) => (
                      <li key={index}>{treatment}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No recommended treatments available</p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleGeneratePriorAuth}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Generate Prior Authorization
              </button>
              <button
                type="button"
                onClick={handleGenerateReferral}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Generate Specialist Referral
              </button>
            </div>
          </div>
        )}
        
        {clinicalTrials.length > 0 && activeTab === 'trials' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Matching Clinical Trials</h3>
            <div className="space-y-4">
              {clinicalTrials.map((trial, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-gray-900">{trial.title}</h4>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {trial.phase}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">ID: {trial.id}</p>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 uppercase">Location</h5>
                        <p className="mt-1 text-sm text-gray-900">{trial.location}</p>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 uppercase">Contact</h5>
                        <p className="mt-1 text-sm text-gray-900">{trial.contact}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h5 className="text-xs font-medium text-gray-500 uppercase">Eligibility</h5>
                      <p className="mt-1 text-sm text-gray-900">{trial.eligibility}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
