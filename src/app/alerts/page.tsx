import ForesightApp from '@/components/ForesightApp';
import React from 'react';

export default function AlertsPage() {
  return (
    <React.Suspense fallback={<div>Loading Alerts...</div>}>
      <ForesightApp />
    </React.Suspense>
  );
} 