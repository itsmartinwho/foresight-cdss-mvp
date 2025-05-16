import ForesightApp from '@/components/ForesightApp';
import React from 'react';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function SettingsPage() {
  return (
    <React.Suspense fallback={<LoadingAnimation />}>
      <ForesightApp />
    </React.Suspense>
  );
} 