'use client';

import React, { useState, useEffect } from 'react';
import { Patient, Admission, Diagnosis, LabResult, Treatment, AdmissionDetailsWrapper, ClinicalTrial } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import Link from 'next/link';
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { FileText } from '@phosphor-icons/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface PatientDetailProps {
  patientId: string;
}

export default function PatientDetail({ patientId }: PatientDetailProps) {
  const [detailedPatientData, setDetailedPatientData] = useState<{ patient: Patient; admissions: AdmissionDetailsWrapper[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('consultation');
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await supabaseDataService.getPatientData(patientId);
        
        if (!data || !data.patient) {
          setError('Patient data not found');
          setDetailedPatientData(null);
        } else {
          setDetailedPatientData(data);
          if (data.admissions && data.admissions.length > 0) {
            // Default to the most recent admission if possible, otherwise the first one
            const sortedAdmissions = [...data.admissions].sort((a, b) => 
              new Date(b.admission.scheduledStart).getTime() - new Date(a.admission.scheduledStart).getTime()
            );
            setSelectedAdmissionId(sortedAdmissions[0].admission.id);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load patient data');
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
    if (!dateOfBirth) return 0; // Handle cases where DOB might be missing
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
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-lg font-medium text-gray-500">Loading patient data...</div>
      </div>
    );
  }

  if (error || !detailedPatientData || !detailedPatientData.patient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Link href="/patients" className="self-start text-blue-600 hover:text-blue-800 transition flex items-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Patients
        </Link>
        <ErrorDisplay message={error || 'Patient not found'} />
      </div>
    );
  }

  const { patient, admissions: admissionsWithDetails } = detailedPatientData;
  const currentAdmissionDetails = admissionsWithDetails?.find((adWrapper: AdmissionDetailsWrapper) => adWrapper.admission.id === selectedAdmissionId);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto bg-white shadow-lg rounded-b-lg">
        {/* Patient Header */}
        <div className="p-6 md:p-8 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-100 rounded-t-lg">
          <div className="flex items-center mb-4">
            <Link href="/patients" className="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out flex items-center mr-4 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Patients
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-center space-x-4">
              {/* Placeholder for patient avatar/icon */}
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {patient.name ? patient.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  {patient.name || 'Unknown Patient'}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                  <span>DOB: {formatDate(patient.dateOfBirth)} (Age: {calculateAge(patient.dateOfBirth)})</span>
                  {/* {patient.mrn && <span>MRN: {patient.mrn}</span>} */}
                  {patient.gender && <span>Gender: {patient.gender}</span>}
                  {patient.ethnicity && <span>Ethnicity: {patient.ethnicity}</span>}
                  {patient.race && <span>Race: {patient.race}</span>}
                </div>
              </div>
            </div>
            
            {admissionsWithDetails && admissionsWithDetails.length > 0 && (
              <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0 w-full md:w-auto md:max-w-xs">
                <label htmlFor="visitSelector" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Visit:
                </label>
                <Select
                  value={selectedAdmissionId || ''}
                  onValueChange={(val) => setSelectedAdmissionId(val)}
                >
                  <SelectTrigger id="visitSelector" className="w-full">
                    <SelectValue placeholder="Select visit" />
                  </SelectTrigger>
                  <SelectContent>
                    {admissionsWithDetails.map((adWrapper: AdmissionDetailsWrapper) => (
                      <SelectItem
                        key={adWrapper.admission.id}
                        value={adWrapper.admission.id}
                      >
                        {formatDateTime(adWrapper.admission.scheduledStart)} -{' '}
                        {adWrapper.admission.reasonCode || 'Visit'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 sticky top-0 bg-white z-10 shadow-sm">
          <div className="max-w-full mx-auto px-2 sm:px-4">
            <nav className="flex space-x-1 overflow-x-auto">
              {[
                { key: 'consultation', label: 'Consultation' },
                { key: 'diagnosis', label: 'Diagnosis' },
                { key: 'treatment', label: 'Treatment' },
                { key: 'labs', label: 'Labs' },
                { key: 'prior_auth', label: 'Prior Auth' },
                { key: 'trials', label: 'Clinical Trials' },
                { key: 'history', label: 'Patient History' },
                { key: 'all_data', label: 'All Data' },
              ].map(tab => (
                <Button
                  key={tab.key}
                  variant="ghost"
                  className={`py-3 px-3 md:px-4 text-center border-b-2 font-medium text-sm transition-colors duration-150 ease-in-out whitespace-nowrap hover:bg-gray-100 hover:text-blue-600 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>

        {/* Current Visit Context (if a visit is selected) */}
        {currentAdmissionDetails && (
          <div className="bg-blue-50 px-4 sm:px-6 lg:px-8 py-3 border-b border-blue-200">
            <div className="max-w-full mx-auto">
              <h2 className="text-md font-semibold text-blue-700">
                Current Visit: {formatDateTime(currentAdmissionDetails.admission.scheduledStart)}
              </h2>
              <p className="text-sm text-blue-600">Reason: {currentAdmissionDetails.admission.reasonCode || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          {(() => { 
            const filteredAdmissions = selectedAdmissionId && admissionsWithDetails
              ? admissionsWithDetails.filter((adWrapper: AdmissionDetailsWrapper) => adWrapper.admission.id === selectedAdmissionId) 
              : []; // If no visit selected, or no admissions, provide empty array
            
            if (!selectedAdmissionId || !currentAdmissionDetails) { 
              return (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center shadow-sm">
                  <p className="text-yellow-700 font-medium">
                    {admissionsWithDetails && admissionsWithDetails.length > 0 
                      ? 'Please select a visit from the dropdown above to see details.' 
                      : 'No visits found for this patient.'}
                  </p>
                </div>
              );
            } 
            
            // Render content based on activeTab and filteredAdmissions (which now refers to the single selected admission)
            const adDetail = currentAdmissionDetails; // Use the already found currentAdmissionDetails

            return <React.Fragment>
              {activeTab === 'consultation' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 sr-only">Consultation Details</h3>
                  {adDetail.admission.transcript && (
                    <div className="bg-white p-5 shadow-md rounded-lg border border-gray-200">
                      <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Transcript
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">{adDetail.admission.transcript}</pre>
                      </div>
                    </div>
                  )}
                  {adDetail.admission.soapNote && (
                    <div className="bg-white p-5 shadow-md rounded-lg border border-gray-200">
                      <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        SOAP Note
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">{adDetail.admission.soapNote}</pre>
                      </div>
                    </div>
                  )}
                  {!adDetail.admission.transcript && !adDetail.admission.soapNote && (
                     <p className="text-center text-gray-500 py-4">No consultation notes (transcript or SOAP) available for this visit.</p>
                  )}
                </div>
              )}

              {activeTab === 'diagnosis' && (
                <div className="bg-white p-5 shadow-md rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Diagnoses for this Visit</h3>
                  {adDetail.diagnoses && adDetail.diagnoses.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {adDetail.diagnoses.map((dx: Diagnosis) => (
                        <li key={dx.code} className="py-3 flex justify-between items-center">
                          <span className="text-gray-800 text-sm md:text-base">{dx.description}</span>
                          <span className="font-mono text-xs md:text-sm bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 tracking-tight">{dx.code}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No diagnoses recorded for this visit.</p>
                  )}
                </div>
              )}

              {activeTab === 'treatment' && (
                <div className="bg-white p-5 shadow-md rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Treatments for this Visit</h3>
                  {adDetail.admission.treatments && adDetail.admission.treatments.length > 0 ? (
                    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
                      {adDetail.admission.treatments.map((tx: Treatment) => (
                        <div key={tx.drug} className="p-4 border rounded-lg bg-slate-50 hover:shadow-lg transition-shadow duration-200">
                          <h4 className="font-semibold text-md text-blue-700 mb-2 truncate" title={tx.drug}>{tx.drug}</h4>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center">
                              <span className="w-20 text-gray-600">Status:</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${{
                                'Active': 'bg-green-100 text-green-800',
                                'Discontinued': 'bg-red-100 text-red-800',
                                'Pending': 'bg-yellow-100 text-yellow-800',
                              }[tx.status] || 'bg-gray-100 text-gray-800'}`}>{tx.status}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 block mb-0.5">Rationale:</span>
                              <p className="text-gray-700 leading-snug">{tx.rationale || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No treatments recorded for this visit.</p>
                  )}
                </div>
              )}

              {activeTab === 'labs' && (
                <div className="bg-white p-0 md:p-5 shadow-md rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 px-5 pt-5 md:px-0 md:pt-0">Lab Results</h3>
                  {adDetail.labResults && adDetail.labResults.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Value</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Units</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Ref. Range</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Flag</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {adDetail.labResults.map((lab: LabResult, idx: number) => (
                            <tr key={idx} className={lab.flag ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{lab.name}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-700">{lab.value}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">{lab.units}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">{lab.referenceRange || 'N/A'}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {lab.flag && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">{lab.flag}</span>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDateTime(lab.dateTime)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4 px-5 md:px-0">No lab results recorded for this visit.</p>
                  )}
                </div>
              )}

              {activeTab === 'prior_auth' && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Prior Authorization Request</h3>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div>
                          <p className="text-gray-500 font-medium">Patient:</p>
                          <p className="text-gray-800">{patient.name} (DOB: {formatDate(patient.dateOfBirth)})</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Medication:</p>
                          <p className="text-gray-800">Methotrexate 15 mg weekly</p> {/* Example data */}
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Diagnosis:</p>
                          <p className="text-gray-800">Rheumatoid Arthritis (ICD-10: M06.9)</p> {/* Example data */}
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Justification:</p>
                          <p className="text-gray-800">Failed NSAIDs, elevated CRP 18 mg/L</p> {/* Example data */}
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-5 flex justify-center">
                        <Button variant="default" iconLeft={<FileText />} className="px-6 py-2.5">
                          Generate PDF Draft
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trials' && (
                <div className="bg-white p-0 md:p-5 shadow-md rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 px-5 pt-5 md:px-0 md:pt-0">Matching Clinical Trials</h3>
                  {/* {adDetail.trials && adDetail.trials.length > 0 ? ( // COMMENTING_OUT - adDetail (AdmissionDetailsWrapper) does not have .trials
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Trial ID</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Patient Fit Score</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {adDetail.trials.map((trial: Record<string, any>, idx:number) => (
                            <tr key={trial.id || idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-600 hover:underline">
                                <a href={`#trial-${trial.id}`} onClick={(e) => e.preventDefault()}>{trial.id}</a>
                              </td>
                              <td className="px-4 py-3 whitespace-normal text-gray-800">{trial.title}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">{trial.distance}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  parseFloat(trial.fit) > 0.7 ? 'bg-green-100 text-green-800' : 
                                  parseFloat(trial.fit) > 0.4 ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {trial.fit}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : ( */}
                     <p className="text-center text-gray-500 py-4 px-5 md:px-0">No clinical trial matches found for this patient based on current data. (Trials feature in this view temporarily adjusted)</p>
                  {/* )} */}
                </div>
              )}
              
              {activeTab === 'history' && (
                <div className="bg-white p-5 shadow-md rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Patient Timeline</h3>
                  <div className="relative pl-2.5">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 rounded-full" aria-hidden="true"></div> {/* Timeline bar */}
                    <div className="space-y-8">
                      {/* Example History Item 1 */}
                      <div className="relative pl-8">
                        <div className="absolute left-[-7px] top-1 h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white"></div>
                        <p className="text-xs text-gray-500 mb-0.5">Apr 24, 2025</p>
                        <p className="text-sm text-gray-700">Initial consult: reports fatigue & joint pain.</p>
                      </div>
                      {/* Example History Item 2 */}
                      <div className="relative pl-8">
                        <div className="absolute left-[-7px] top-1 h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white"></div>
                        <p className="text-xs text-gray-500 mb-0.5">Apr 24, 2025</p>
                        <p className="text-sm text-gray-700">Labs ordered: ESR, CRP, RF, anti-CCP.</p>
                      </div>
                       {/* Example History Item 3 */}
                      <div className="relative pl-8">
                        <div className="absolute left-[-7px] top-1 h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white"></div>
                        <p className="text-xs text-gray-500 mb-0.5">Apr 24, 2025</p>
                        <p className="text-sm text-gray-700">AI suggested provisional RA diagnosis based on initial symptoms and common patterns.</p>
                      </div>
                      {/* Add more history items as needed */}
                    </div>
                  </div>
                  {/* {(patient?.history?.length === 0 || !patient?.history) && ( // COMMENTED_OUT - patient.history does not exist
                     <p className="text-center text-gray-500 py-4">No historical events recorded for this patient.</p>
                  )} */}
                   <p className="text-center text-gray-500 py-4">(Patient history feature in this view temporarily adjusted)</p>
                </div>
              )}

              {activeTab === 'all_data' && (
                 <div className="p-6 text-center text-gray-500">All Data view temporarily disabled for testing.</div>
              )}
            </React.Fragment>; 
          })()}
        </div>
      </div>
    </div>
  );
}
