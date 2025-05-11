import ForesightApp from '@/components/ForesightApp';
import React from 'react';

export default function AnalyticsPage() {
  return (
    <React.Suspense fallback={<div>Loading Analytics...</div>}>
      <ForesightApp />
    </React.Suspense>
  );
} 