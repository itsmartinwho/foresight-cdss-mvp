import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { patientDataService } from '@/lib/patientDataService';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './ui/button';
import { formatDate } from '@/lib/utils';

export default function RecentConsultations() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConsultations = async () => {
      try {
        setLoading(true);
        // This would ideally get consultations from an API endpoint
        const patients = await patientDataService.getAllPatients();
        
        // Mock recent consultations by using patient data and adding timestamps
        // In a real app, this would come from a dedicated API endpoint
        const mockConsultations = patients.slice(0, 5).map(patient => ({
          id: `cons-${patient.id}`,
          patientId: patient.id,
          patientName: `Patient ${patient.id.substring(0, 8)}`,
          dateOfBirth: patient.dateOfBirth,
          dateTime: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // Random date within last week
          status: Math.random() > 0.3 ? 'Completed' : 'In Progress',
          notes: 'Clinical notes available'
        }));
        
        // Sort by most recent first
        mockConsultations.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
        
        setConsultations(mockConsultations);
      } catch (err) {
        console.error('Failed to load consultations:', err);
        setError('Failed to load recent consultations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadConsultations();
  }, []);

  const viewConsultation = (consultationId: string, patientId: string) => {
    router.push(`/consultation/${patientId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500 text-center py-8">No recent consultations found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Patient
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date & Time
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {consultations.map((consultation) => (
            <tr key={consultation.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{consultation.patientName}</div>
                <div className="text-sm text-gray-500">DOB: {formatDate(consultation.dateOfBirth)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatDate(consultation.dateTime)}</div>
                <div className="text-sm text-gray-500">
                  {consultation.dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  consultation.status === 'Completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {consultation.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Button
                  onClick={() => viewConsultation(consultation.id, consultation.patientId)}
                  variant="outline"
                  size="sm"
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 