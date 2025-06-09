'use client';

import React from 'react';
import GuidelinesTab from '@/components/guidelines/GuidelinesTab';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function GuidelinesPage() {
  return (
    <React.Suspense fallback={<LoadingAnimation />}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <GuidelinesTab />
        </div>
      </div>
    </React.Suspense>
  );
} 