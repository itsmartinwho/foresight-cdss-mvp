'use client';

import React from 'react';
import ForesightApp from '@/components/ForesightApp';

export default function PatientsPage() {
  return (
    <React.Suspense fallback={<div>Loading Patients...</div>}>
      <ForesightApp />
    </React.Suspense>
  );
}
