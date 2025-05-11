'use client';

import React from 'react';
import ForesightApp from '@/components/ForesightApp';

export default function PatientDetailRoute() {
  return (
    <React.Suspense fallback={<div>Loading Patient...</div>}>
      <ForesightApp />
    </React.Suspense>
  );
}
