'use client';

import ForesightApp from '@/components/ForesightApp';
import React from 'react';

export default function AdvisorPage() {
  return (
    <React.Suspense fallback={<div>Loading Advisor...</div>}>
      <ForesightApp />
    </React.Suspense>
  );
}
