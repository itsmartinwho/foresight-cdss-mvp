'use client';

import React, { useState, useEffect } from 'react';
import { Patient, Admission, Diagnosis, LabResult } from '@/lib/types';
import { patientDataService } from '@/lib/patientDataService';
import { clinicalEngineService } from '@/lib/clinicalEngineService';
import Link from 'next/link';

interface PatientDetailProps {
  patientId: string;
}

export default function PatientDetail({ patientId }: PatientDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('consultation');
  const [selectedAdmission, setSelectedAdmission] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatientData() {
      try {
        await patientDataService.loadPatientData();
        const patientData = patientDataService.getPatient(patientId);
        
        if (!patientData) {
          setError('Patient not found');
          setLoading(false);
          return;
        }
        
        setPatient(patientData);
        
        const patientAdmissions = patientDataService.getPatientAdmissions(patientId);
        
        // Get detailed admission data including diagnoses and lab results
        const admissionsWithDetails = patientAdmissions.map(admission => {
          const diagnoses = patientDataService.getPatientDiagnoses(patientId, admission.id);
          const labResults = patientDataService.getPatientLabResults(patientId, admission.id);
          
          return {
            admission,
            diagnoses,
            labResults
          };
        });
        
        setAdmissions(admissionsWithDetails);
        
        if (admissionsWithDetails.length > 0) {
          setSelectedAdmission(admissionsWithDetails[0].admission.id);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load patient data');
        setLoading(false);
        console.error('Error loading patient data:', err);
      }
    }

    loadPatientData();
  }, [patientId]);

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDOB = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getSelectedAdmissionData = () => {
    if (!selectedAdmission) return null;
    
    return admissions.find(item => item.admission.id === selectedAdmission);
  };

  const hasAutoimmune = patientId ? patientDataService.hasAutoimmuneDiagnosis(patientId) : false;
  const hasOncology = patientId ? patientDataService.hasOncologyDiagnosis(patientId) : false;

  const getRecentLabResults = () => {
    if (admissions.length === 0) return [];
    
    // Get the most recent admission
    const sortedAdmissions = [...admissions].sort((a, b) => 
      new Date(b.admission.startDate).getTime() - new Date(a.admission.startDate).getTime()
    );
    
    const recentAdmission = sortedAdmissions[0];
    if (!recentAdmission || !recentAdmission.labResults) return [];
    
    return recentAdmission.labResults.slice(0, 10);
  };

  const getDiagnosisByCode = (code: string): string => {
    for (const admission of admissions) {
      for (const diagnosis of admission.diagnoses) {
        if (diagnosis.code.startsWith(code)) {
          return diagnosis.description;
        }
      }
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-gray-500">Loading patient data...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-red-500">{error || 'Patient not found'}</div>
      </div>
    );
  }

  // Generate a human-readable patient name based on patient ID
  const patientNames = {
    'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F': 'John Smith',
    '64182B95-EB72-4E2B-BE77-8050B71498CE': 'Michael Johnson',
    'DB22A4D9-7E4D-485C-916A-9CD1386507FB': 'Sarah Williams',
    '6E70D84D-C75F-477C-BC37-9177C3698C66': 'David Brown',
    'C8556CC0-32FC-4CA5-A8CD-9CCF38816167': 'Emma Davis',
    '7FD13988-E58A-4A5C-8680-89AC200950FA': 'James Wilson',
    'C60FE675-CA52-4C55-A233-F4B27E94987F': 'Robert Taylor',
    'B39DC5AC-E003-4E6A-91B6-FC07625A1285': 'Jennifer Miller',
    'FA157FA5-F488-4884-BF87-E144630D595C': 'Patricia Anderson',
    'B7E9FC4C-5182-4A34-954E-CEF5FC07E96D': 'Maria Gomez'
  };

  const patientName = patientNames[patientId] || 'Unknown Patient';

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Patient header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <Link href="/patients" className="text-blue-600 mr-2">
            ← Patients
          </Link>
          <h1 className="text-xl font-bold text-gray-800">
            {patientName} <span className="text-gray-500 font-normal text-sm">DOB {formatDOB(patient.dateOfBirth)}</span>
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            className={`py-5 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'consultation'
                ? 'border-blue-500 text-blue-600 bg-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('consultation')}
          >
            Consultation
          </button>
          <button
            className={`py-5 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'diagnosis'
                ? 'border-blue-500 text-blue-600 bg-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('diagnosis')}
          >
            Diagnosis
          </button>
          <button
            className={`py-5 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'treatment'
                ? 'border-blue-500 text-blue-600 bg-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('treatment')}
          >
            Treatment
          </button>
          <button
            className={`py-5 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'labs'
                ? 'border-blue-500 text-blue-600 bg-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('labs')}
          >
            Labs
          </button>
          <button
            className={`py-5 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'prior_auth'
                ? 'border-blue-500 text-blue-600 bg-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('prior_auth')}
          >
            Prior Auth
          </button>
          <button
            className={`py-5 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'trials'
                ? 'border-blue-500 text-blue-600 bg-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('trials')}
          >
            Trials
          </button>
          <button
            className={`py-5 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 bg-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-8 px-6 pb-6">
        {activeTab === 'consultation' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Transcript</h2>
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-700 font-medium">Dr:</p>
                      <p className="text-gray-600">How have you been feeling since your last visit?</p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">Maria:</p>
                      <p className="text-gray-600">Still tired all the time and my hands ache in the morning.</p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">Dr:</p>
                      <p className="text-gray-600">Any swelling or redness in the joints?</p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">Maria:</p>
                      <p className="text-gray-600">Some swelling, yes.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Structured Note (SOAP)</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-700 font-medium">S:</p>
                      <p className="text-gray-600">{calculateAge(patient.dateOfBirth)}-year-old {patient.gender.toLowerCase()} with 6-month history of symmetric hand pain and morning stiffness (90 min). Denies fever or rash.</p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">O:</p>
                      <p className="text-gray-600">MCP and PIP joints tender on palpation, mild edema. ESR 38 mm/h, CRP 18 mg/L, RF positive, anti-CCP strongly positive.</p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">A:</p>
                      <p className="text-gray-600">Early rheumatoid arthritis highly likely [1].</p>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">P:</p>
                      <p className="text-gray-600">Initiate methotrexate 15 mg weekly with folic acid 1 mg daily. Order baseline LFTs, schedule ultrasound of hands in 6 weeks. Discuss exercise and smoking cessation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div>
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Differential</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Condition
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Probability
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rheumatoid Arthritis
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        45%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        [1]
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Systemic Lupus Erythematosus
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        22%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        [2]
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Fibromyalgia
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        16%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Explanation & Evidence</h2>
              <div className="bg-gray-50 p-4 rounded-md space-y-3">
                <p className="text-gray-600">High anti-CCP titre and symmetric small-joint involvement increase likelihood of RA [1].</p>
                <p className="text-gray-600">Elevated ESR & CRP consistent with active inflammatory arthritis. [2]</p>
                <p className="text-gray-500 text-sm mt-4">[1] ACR RA Guidelines 2023 • [2] Lancet Rheumatology 2024 systematic review.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatment' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current & Proposed Therapy</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medication
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rationale
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Methotrexate 15 mg weekly
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Proposed
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      First-line csDMARD per ACR 2023 guidelines after NSAID failure [3]
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Folic acid 1 mg daily
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Supportive
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      Reduces MTX-induced GI adverse effects [4]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'labs' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Labs</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ref
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr className="bg-red-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ESR
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      38 mm/h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      &lt;20
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      H
                    </td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      CRP
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      18 mg/L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      &lt;5
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      H
                    </td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RF
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      +
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Neg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      H
                    </td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      anti-CCP
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ++
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Neg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      H
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'prior_auth' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Prior Authorization Draft</h2>
            <div className="bg-gray-50 p-6 rounded-md space-y-4">
              <div>
                <p className="text-gray-700 font-medium">Patient:</p>
                <p className="text-gray-600">{patientName} DOB: {formatDOB(patient.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Medication:</p>
                <p className="text-gray-600">Methotrexate 15 mg weekly</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Diagnosis:</p>
                <p className="text-gray-600">Rheumatoid Arthritis (ICD-10 M06.9)</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Justification:</p>
                <p className="text-gray-600">Failed NSAIDs, elevated CRP 18 mg/L</p>
              </div>
              <div className="mt-6">
                <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trials' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Matching Clinical Trials</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      NCT055123
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Abatacept vs Placebo in Early RA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      12 mi
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      82%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      NCT061987
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      JAK Inhibitor Tofacitinib Long-Term Safety
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      32 mi
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      77%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Timeline</h2>
            <div className="bg-gray-50 p-6 rounded-md space-y-4">
              <div>
                <p className="text-gray-600">2025-04-24 – Initial consult: fatigue & joint pain.</p>
              </div>
              <div>
                <p className="text-gray-600">2025-04-24 – Labs ordered: ESR, CRP, RF, anti-CCP.</p>
              </div>
              <div>
                <p className="text-gray-600">2025-04-24 – AI suggested provisional RA diagnosis.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
