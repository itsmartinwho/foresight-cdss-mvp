'use client';

import React, { useState, useEffect } from 'react';
import { Patient, Admission, Diagnosis, LabResult, Treatment } from '@/lib/types';
import { patientDataService } from '@/lib/patientDataService';
import Link from 'next/link';

interface PatientDetailProps {
  patientId: string;
}

export default function PatientDetail({ patientId }: PatientDetailProps) {
  const [detailedPatientData, setDetailedPatientData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('consultation');
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        await patientDataService.loadPatientData();
        const data = patientDataService.getPatientData(patientId);
        
        if (!data || !data.patient) {
          setError('Patient data not found');
          setDetailedPatientData(null);
        } else {
          setDetailedPatientData(data);
          if (data.admissions && data.admissions.length > 0) {
            setSelectedAdmissionId(data.admissions[0].admission.id);
          }
        }
      } catch (err: any) {
        setError('Failed to load patient data: ' + err.message);
        console.error('Error loading patient data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (patientId) {
      loadData();
    }
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-gray-500">Loading patient data...</div>
      </div>
    );
  }

  if (error || !detailedPatientData || !detailedPatientData.patient) {
    return (
      <div className="p-6">
        <Link href="/patients" className="text-blue-600 mr-2 mb-4 inline-block">
          ← Patients
        </Link>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg font-medium text-red-500">{error || 'Patient not found'}</div>
        </div>
      </div>
    );
  }

  const { patient, admissions: admissionsWithDetails } = detailedPatientData;

  return (
    <div className="bg-white shadow rounded-lg max-w-7xl mx-auto">
      {/* Patient header - Enhanced with better spacing and visual hierarchy */}
      <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center mb-2">
          <Link href="/patients" className="text-blue-600 hover:text-blue-800 transition flex items-center mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Patients
          </Link>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {patient.name || 'Unknown Patient'}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>DOB: {formatDate(patient.dateOfBirth)}</span>
              <span>Age: {calculateAge(patient.dateOfBirth)}</span>
              {patient.mrn && <span>MRN: {patient.mrn}</span>}
            </div>
          </div>
          {/* Consultation selector moved here for better visibility */}
          {detailedPatientData && detailedPatientData.admissions && detailedPatientData.admissions.length > 1 && (
            <div className="mt-4 md:mt-0 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <label className="font-medium text-sm text-gray-700 block mb-1">Current Visit:</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedAdmissionId || ''}
                onChange={(e) => setSelectedAdmissionId(e.target.value)}
              >
                {detailedPatientData.admissions.map((ad: any) => (
                  <option key={ad.admission.id} value={ad.admission.id}>
                    {formatDateTime(ad.admission.scheduledStart) || ad.admission.id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs - Enhanced with consistent width */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex justify-between overflow-x-auto">
            {['consultation', 'diagnosis', 'treatment', 'labs', 'prior_auth', 'trials', 'history', 'all_data'].map(tabName => (
              <button
                key={tabName}
                className={`py-4 px-4 text-center border-b-2 font-medium text-sm transition whitespace-nowrap flex-1 ${
                  activeTab === tabName
                    ? 'border-blue-500 text-blue-600 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tabName)}
              >
                {tabName.replace('_', ' ').replace('all data', 'All Patient Data').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Visit Information - Enhanced styling for current visit */}
      {selectedAdmissionId && detailedPatientData.admissions && (
        <div className="bg-blue-50 px-8 py-4 border-b border-blue-100">
          <div className="max-w-7xl mx-auto">
            {(() => {
              const currentAdmission = detailedPatientData.admissions.find((ad: any) => ad.admission.id === selectedAdmissionId);
              if (!currentAdmission) return null;
              return (
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      Visit on: {formatDateTime(currentAdmission.admission.scheduledStart)}
                    </h2>
                    <p className="text-gray-600">Reason: {currentAdmission.admission.reason}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Content area - Enhanced with better spacing and margins */}
      <div className="p-8">
        {(() => { 
          const filteredAdmissions = selectedAdmissionId 
            ? detailedPatientData.admissions.filter((ad:any) => ad.admission.id === selectedAdmissionId) 
            : detailedPatientData.admissions; 
          
          if (!filteredAdmissions || filteredAdmissions.length === 0) { 
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-700">No consultation data found.</p>
              </div>
            );
          } 
          
          return <React.Fragment>

        {activeTab === 'consultation' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Consultation Details</h2>
            {filteredAdmissions.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="mb-8 p-6 border rounded-lg shadow-sm bg-white">
                {adDetail.admission.transcript && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Transcript
                    </h4>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700">{adDetail.admission.transcript}</pre>
                    </div>
                  </div>
                )}
                
                {adDetail.admission.soapNote && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      SOAP Note
                    </h4>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700">{adDetail.admission.soapNote}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Diagnoses for this Visit</h2>
            {filteredAdmissions.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="p-6 border rounded-lg shadow-sm bg-white">
                <div className="space-y-4">
                  {adDetail.diagnoses.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {adDetail.diagnoses.map((dx: Diagnosis) => (
                        <div key={dx.code} className="py-3 flex justify-between">
                          <div className="text-gray-800">{dx.description}</div>
                          <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">{dx.code}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No diagnoses recorded for this visit.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'treatment' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Treatments for this Visit</h2>
            {filteredAdmissions.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="p-6 border rounded-lg shadow-sm bg-white">
                {adDetail.admission.treatments && adDetail.admission.treatments.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {adDetail.admission.treatments.map((tx: Treatment) => (
                      <div key={tx.drug} className="p-4 border rounded-md bg-gray-50">
                        <h4 className="font-medium text-lg mb-2">{tx.drug}</h4>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="w-24 text-gray-600 text-sm">Status:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'Active' ? 'bg-green-100 text-green-800' : 
                              tx.status === 'Discontinued' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800'
                            }`}>{tx.status}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 text-sm">Rationale:</span>
                            <p className="text-gray-800 mt-1">{tx.rationale}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No treatments recorded for this visit.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'labs' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Lab Results</h2>
            {filteredAdmissions.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="p-6 border rounded-lg shadow-sm bg-white">
                {adDetail.labResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Range</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {adDetail.labResults.map((lab: LabResult, idx: number) => (
                          <tr key={idx} className={lab.flag ? 'bg-yellow-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lab.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {lab.value} {lab.units} {lab.flag && <span className="text-red-500 ml-1">({lab.flag})</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lab.referenceRange || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(lab.dateTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No lab results recorded for this visit.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'prior_auth' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Prior Authorization</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-3xl mx-auto">
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Authorization Draft</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-gray-500 text-sm">Patient</p>
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-sm text-gray-600">DOB: {formatDate(patient.dateOfBirth)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Medication</p>
                      <p className="font-medium">Methotrexate 15 mg weekly</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Diagnosis</p>
                      <p className="font-medium">Rheumatoid Arthritis</p>
                      <p className="text-sm text-gray-600">ICD-10: M06.9</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Justification</p>
                      <p>Failed NSAIDs, elevated CRP 18 mg/L</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition shadow-sm">
                    Generate PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trials' && filteredAdmissions[0] && filteredAdmissions[0].trials && filteredAdmissions[0].trials.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Matching Clinical Trials</h2>
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAdmissions[0].trials.map((trial: any) => (
                      <tr key={trial.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                          <a href={`#trial-${trial.id}`}>{trial.id}</a>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{trial.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trial.distance}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            parseFloat(trial.fit) > 0.7 ? 'bg-green-100 text-green-800' : 
                            parseFloat(trial.fit) > 0.4 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {trial.fit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'trials' && (!filteredAdmissions[0] || !filteredAdmissions[0].trials || filteredAdmissions[0].trials.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-500">No trial matches available for this consultation.</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Patient History</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-6 w-1 bg-blue-100"></div>
                <div className="space-y-8">
                  <div className="relative pl-10">
                    <div className="absolute -left-2 top-1 h-4 w-4 rounded-full bg-blue-600"></div>
                    <div className="mb-1 text-sm font-semibold text-gray-600">2025-04-24</div>
                    <p className="text-gray-800">Initial consult: fatigue & joint pain.</p>
                  </div>
                  <div className="relative pl-10">
                    <div className="absolute -left-2 top-1 h-4 w-4 rounded-full bg-blue-600"></div>
                    <div className="mb-1 text-sm font-semibold text-gray-600">2025-04-24</div>
                    <p className="text-gray-800">Labs ordered: ESR, CRP, RF, anti-CCP.</p>
                  </div>
                  <div className="relative pl-10">
                    <div className="absolute -left-2 top-1 h-4 w-4 rounded-full bg-blue-600"></div>
                    <div className="mb-1 text-sm font-semibold text-gray-600">2025-04-24</div>
                    <p className="text-gray-800">AI suggested provisional RA diagnosis.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'all_data' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Raw Patient Data</h2>
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 overflow-auto">
              <pre className="text-xs font-mono bg-gray-50 p-4 rounded whitespace-pre-wrap break-all">
                {JSON.stringify(detailedPatientData, null, 2)}
              </pre>
            </div>
          </div>
        )}
        </React.Fragment>; 
        })()}
      </div>
    </div>
  );
}
