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
    <div className="bg-white shadow rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <Link href="/patients" className="text-blue-600 mr-2">
            ← Patients
          </Link>
          <h1 className="text-xl font-bold text-gray-800">
            {patient.name || 'Unknown Patient'} <span className="text-gray-500 font-normal text-sm">DOB {formatDate(patient.dateOfBirth)}</span>
          </h1>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex px-2 overflow-x-auto">
          {['consultation', 'diagnosis', 'treatment', 'labs', 'prior_auth', 'trials', 'history', 'all_data'].map(tabName => (
            <button
              key={tabName}
              className={`py-4 px-4 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tabName
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName.replace('_', ' ').replace('all data', 'All Patient Data').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-6 px-4 pb-4 md:px-6 md:pb-6">
        {activeTab === 'consultation' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Consultation Details</h2>
            {admissionsWithDetails.length > 0 ? admissionsWithDetails.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="mb-6 p-4 border rounded-md">
                <h3 className="font-semibold">Visit: {formatDateTime(adDetail.admission.scheduledStart)} - {adDetail.admission.reason}</h3>
                {adDetail.admission.transcript && <div className="mt-2"><h4 className="font-medium">Transcript:</h4><pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">{adDetail.admission.transcript}</pre></div>}
                {adDetail.admission.soapNote && <div className="mt-2"><h4 className="font-medium">SOAP Note:</h4><pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">{adDetail.admission.soapNote}</pre></div>}
              </div>
            )) : <p>No consultation records found.</p>}
          </div>
        )}
        {activeTab === 'diagnosis' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Diagnoses by Visit</h2>
            {admissionsWithDetails.length > 0 ? admissionsWithDetails.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="mb-6 p-4 border rounded-md">
                <h3 className="font-semibold">Visit: {formatDateTime(adDetail.admission.scheduledStart)} - {adDetail.admission.reason}</h3>
                {adDetail.diagnoses.length > 0 ? adDetail.diagnoses.map((dx: Diagnosis) => (
                  <p key={dx.code} className="text-sm ml-4">- {dx.description} ({dx.code})</p>
                )) : <p className="text-sm ml-4">No diagnoses for this visit.</p>}
              </div>
            )) : <p>No diagnostic records found.</p>}
          </div>
        )}
        {activeTab === 'treatment' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Treatments by Visit</h2>
            {admissionsWithDetails.length > 0 ? admissionsWithDetails.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="mb-6 p-4 border rounded-md">
                <h3 className="font-semibold">Visit: {formatDateTime(adDetail.admission.scheduledStart)} - {adDetail.admission.reason}</h3>
                {adDetail.admission.treatments && adDetail.admission.treatments.length > 0 ? adDetail.admission.treatments.map((tx: Treatment) => (
                  <div key={tx.drug} className="text-sm ml-4">
                    <p><strong>Drug:</strong> {tx.drug}</p>
                    <p><strong>Status:</strong> {tx.status}</p>
                    <p><strong>Rationale:</strong> {tx.rationale}</p>
                  </div>
                )) : <p className="text-sm ml-4">No treatments for this visit.</p>}
              </div>
            )) : <p>No treatment records found.</p>}
          </div>
        )}
        {activeTab === 'labs' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Lab Results by Visit</h2>
            {admissionsWithDetails.length > 0 ? admissionsWithDetails.map((adDetail: any) => (
              <div key={adDetail.admission.id} className="mb-6 p-4 border rounded-md">
                <h3 className="font-semibold">Visit: {formatDateTime(adDetail.admission.scheduledStart)} - {adDetail.admission.reason}</h3>
                {adDetail.labResults.length > 0 ? adDetail.labResults.map((lab: LabResult, idx: number) => (
                  <div key={idx} className="text-sm ml-4 mb-1">
                    <p><strong>Test:</strong> {lab.name} | <strong>Value:</strong> {lab.value} {lab.units} {lab.flag ? `(${lab.flag})` : ''} | <strong>Ref:</strong> {lab.referenceRange || 'N/A'} | <strong>Date:</strong> {formatDateTime(lab.dateTime)}</p>
                  </div>
                )) : <p className="text-sm ml-4">No lab results for this visit.</p>}
              </div>
            )) : <p>No lab records found.</p>}
          </div>
        )}
        {activeTab === 'prior_auth' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Prior Authorization Draft</h2>
            <div className="bg-gray-50 p-6 rounded-md space-y-4">
              <div>
                <p className="text-gray-700 font-medium">Patient:</p>
                <p className="text-gray-600">{patient.name} DOB: {formatDate(patient.dateOfBirth)}</p>
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
        {activeTab === 'all_data' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">All Patient Data (Raw)</h2>
            <pre className="text-xs bg-gray-50 p-4 rounded whitespace-pre-wrap break-all">
              {JSON.stringify(detailedPatientData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
