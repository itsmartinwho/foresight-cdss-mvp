'use client';

import React from 'react';
import Layout from '@/components/Layout';
import { PatientList } from '@/components/PatientList';

export default function PatientsPage() {
  return (
    <Layout currentPath="/patients">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Patients</h1>
        <PatientList />
      </div>
    </Layout>
  );
}
