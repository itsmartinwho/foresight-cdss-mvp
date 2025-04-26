'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import PatientDetail from '@/components/PatientDetail';

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;

  return (
    <Layout currentPath="/patients">
      <div className="px-4 py-6 sm:px-0">
        <PatientDetail patientId={patientId} />
      </div>
    </Layout>
  );
}
