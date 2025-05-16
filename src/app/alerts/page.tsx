import ForesightApp from '@/components/ForesightApp';
import React from 'react';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function AlertsPage() {
  return (
    <React.Suspense fallback={<LoadingAnimation />}>
      <ForesightApp />
    </React.Suspense>
  );
} 