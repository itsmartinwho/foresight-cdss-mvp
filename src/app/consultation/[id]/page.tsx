'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import ConsultationView from '@/components/ConsultationView';

export default function ConsultationPage() {
  const params = useParams();
  const patientId = params.id as string;

  return (
    <Layout currentPath="/consultation">
      <div className="px-4 py-6 sm:px-0">
        <ConsultationView patientId={patientId} />
      </div>
    </Layout>
  );
}
