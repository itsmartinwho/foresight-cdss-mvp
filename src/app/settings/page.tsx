import ForesightApp from '@/components/ForesightApp';
import React from 'react';

export default function SettingsPage() {
  return (
    <React.Suspense fallback={<div>Loading Settings...</div>}>
      <ForesightApp />
    </React.Suspense>
  );
} 