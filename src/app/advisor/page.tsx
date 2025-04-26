'use client';

import React from 'react';
import Layout from '@/components/Layout';
import DiagnosticAdvisor from '@/components/DiagnosticAdvisor';

export default function AdvisorPage() {
  return (
    <Layout currentPath="/advisor">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Diagnostic Advisor</h1>
        <DiagnosticAdvisor />
      </div>
    </Layout>
  );
}
