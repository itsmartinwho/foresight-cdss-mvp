'use client';

import React, { useEffect, useState } from 'react';
import { patientDataService } from '@/lib/patientDataService';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

export const PatientList = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        await patientDataService.loadPatientData();
        const allPatients = patientDataService.getAllPatients();
        setPatients(allPatients);
        setFilteredPatients(allPatients);
        setLoading(false);
      } catch (error) {
        setError('Failed to load patients');
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = patients.filter((patient) => {
      return (
        patient.id.toLowerCase().includes(searchTermLower) ||
        (patient.name && patient.name.toLowerCase().includes(searchTermLower)) ||
        (patient.gender && patient.gender.toLowerCase().includes(searchTermLower)) ||
        (patient.dob && patient.dob.toLowerCase().includes(searchTermLower))
      );
    });

    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  // Group patients by status (recent, upcoming, all)
  const recentPatients = filteredPatients.filter(patient => {
    const lastSeen = new Date(patient.lastConsultation || "2000-01-01");
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return lastSeen >= oneWeekAgo;
  });

  const upcomingPatients = filteredPatients.filter(patient => {
    const admissions = patientDataService.getPatientAdmissions(patient.id) || [];
    const now = new Date();
    return admissions.some(ad => ad.scheduledStart && new Date(ad.scheduledStart) > now);
  });

  const renderPatientTable = (patientList: any[]) => {
    if (patientList.length === 0) {
      return <p className="text-center py-4">No patients found</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Gender</th>
              <th className="px-6 py-3">Date of Birth</th>
              <th className="px-6 py-3">Race</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patientList.map((patient) => (
              <tr key={patient.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4">{patient.id}</td>
                <td className="px-6 py-4">{patient.name || 'N/A'}</td>
                <td className="px-6 py-4">{patient.gender || 'N/A'}</td>
                <td className="px-6 py-4">
                  {patient.dob ? formatDate(new Date(patient.dob)) : 'N/A'}
                </td>
                <td className="px-6 py-4">{patient.race || 'N/A'}</td>
                <td className="px-6 py-4 space-x-2">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                  <Link
                    href={`/consultation/${patient.id}`}
                    className="text-green-600 hover:underline"
                  >
                    Start Consultation
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Patient Dashboard</h1>
        <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
          <Input
            type="search"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" onClick={() => {}}>Search</Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Patients</TabsTrigger>
          <TabsTrigger value="recent">Recent Consultations</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-4">All Patients</h2>
            {renderPatientTable(filteredPatients)}
          </div>
        </TabsContent>
        
        <TabsContent value="recent">
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-4">Recent Consultations</h2>
            {renderPatientTable(recentPatients)}
          </div>
        </TabsContent>
        
        <TabsContent value="upcoming">
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
            {renderPatientTable(upcomingPatients)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
