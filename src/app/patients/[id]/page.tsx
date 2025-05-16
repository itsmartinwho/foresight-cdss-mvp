'use client';

import React from 'react';
import ForesightApp from '@/components/ForesightApp';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function PatientDetailRoute() {
  return (
    <React.Suspense fallback={<LoadingAnimation />}>
      <ForesightApp />
    </React.Suspense>
  );
}
